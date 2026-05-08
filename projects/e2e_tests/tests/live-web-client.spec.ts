import { expect, test, type Page, type Route } from "@playwright/test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import net from "node:net";

type SessionRecord = {
  project_id: string;
  workspace_id: string;
  workspace: string;
  url: string;
  started_at: string;
};

type AppRecord = {
  pid: number;
  url: string;
  started_at: string;
};

type RuntimeEnsureResult = {
  project_id: string;
  workspace_id: string;
  workspace: string;
};

type ProjectSessionResponse = {
  session: {
    project_id: string;
    workspace_id: string;
    workspace: string;
    started_at: string;
  } | null;
};

type ProcessHandle = {
  process: ChildProcess;
  output: () => string;
  stop: () => Promise<void>;
};

type LiveStack = {
  webUrl: string;
  session: SessionRecord;
  home: string;
  close: () => Promise<void>;
};

type SessionStack = {
  session: SessionRecord;
  home: string;
  env: NodeJS.ProcessEnv;
  close: () => Promise<void>;
};

type CollectionRecord = Record<string, unknown>;

type CollectionsBootstrap = {
  cursor: number;
  tasks: CollectionRecord[];
  baselines: CollectionRecord[];
  artifacts: CollectionRecord[];
  compute_targets: CollectionRecord[];
  events: CollectionRecord[];
  sessions: CollectionRecord[];
};

type CollectionChange = {
  cursor: number;
  collection: string;
  key: string;
  op: "upsert" | "delete";
  record?: CollectionRecord | null;
  source_event_id?: number | null;
};

type CollectionsChangesSince = {
  changes: CollectionChange[];
  cursor: number;
  has_more?: boolean;
  reset_required?: boolean;
};

type ArtifactReadResult = {
  artifact_id: string;
  media_type: string | null;
  size_bytes: number;
  content: string;
  truncated: boolean;
  truncated_at_bytes?: number | null;
};

type SmokeInfrastructureStallSeed = {
  project_id: string;
  session_id: string;
  stale_task_id: string;
  stuck_task_ids: string[];
  stuck_workflow_ids: string[];
  runnable_task_id: string;
  compute_target_id: string;
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("session server changes_since replays missed setup changes from cursor zero", async (
  {},
  testInfo,
) => {
  testInfo.setTimeout(60_000);
  const stack = await startSessionStack({ requireAnthropic: false });
  try {
    await rpcRequest(stack.session, "setup.complete", {});
    const bootstrap = await collectionsBootstrap(stack.session);
    expect(bootstrap.cursor).toBeGreaterThan(0);

    const replay = await collectionsChangesSince(stack.session, {
      cursor: 0,
      limit: 1000,
    });

    expect(replay.reset_required).toBe(false);
    expect(replay.has_more).toBe(false);
    expect(replay.cursor).toBe(bootstrap.cursor);
    expect(replay.changes.length).toBeGreaterThan(0);
    expectSequentialCursors(replay.changes, { after: 0 });
    const changedCollections = new Set(
      replay.changes.map((change) => change.collection),
    );
    expect(changedCollections.has("workspaces")).toBe(true);
    expect(changedCollections.has("events")).toBe(true);

    const stable = await collectionsChangesSince(stack.session, {
      cursor: bootstrap.cursor,
    });
    expect(stable.reset_required).toBe(false);
    expect(stable.changes).toEqual([]);
    expect(stable.cursor).toBe(bootstrap.cursor);
  } finally {
    await stack.close();
  }
});

test("session server changes_since pages stale recovery to the current cursor", async (
  {},
  testInfo,
) => {
  testInfo.setTimeout(60_000);
  const stack = await startSessionStack({ requireAnthropic: false });
  try {
    await rpcRequest(stack.session, "setup.complete", {});
    const bootstrap = await collectionsBootstrap(stack.session);
    expect(bootstrap.cursor).toBeGreaterThan(0);

    const replayed: CollectionChange[] = [];
    let cursor = 0;
    for (let guard = 0; guard < 100; guard += 1) {
      const page = await collectionsChangesSince(stack.session, {
        cursor,
        limit: 1,
      });
      expect(page.reset_required).toBe(false);
      expect(page.changes.length).toBeLessThanOrEqual(1);
      replayed.push(...page.changes);
      cursor = page.cursor;
      if (!page.has_more) {
        break;
      }
    }

    expect(cursor).toBe(bootstrap.cursor);
    expect(replayed.length).toBe(bootstrap.cursor);
    expectSequentialCursors(replayed, { after: 0 });
  } finally {
    await stack.close();
  }
});

test("session server publishes operator compute target changes", async (
  {},
  testInfo,
) => {
  testInfo.setTimeout(60_000);
  const stack = await startSessionStack({ requireAnthropic: false });
  try {
    await rpcRequest(stack.session, "setup.complete", {});
    const before = await collectionsBootstrap(stack.session);

    const addResult = runCheckedOutput(
      "uv",
      [
        "run",
        "--project",
        REPO_ROOT,
        "--package",
        "situ-harness",
        "situ",
        "compute",
        "add",
        "--pool",
        "e2e-h100",
        "--label",
        "E2E H100",
        "--cuda-visible-devices",
        "7",
        "--json",
      ],
      REPO_ROOT,
      stack.env,
    );
    const target = JSON.parse(addResult.stdout) as CollectionRecord;
    expect(target.pool).toBe("e2e-h100");
    expect(metadataValue(target, "cuda_visible_devices")).toBe("7");

    const changes = await collectionsChangesSince(stack.session, {
      cursor: before.cursor,
      limit: 100,
    });
    const change = changes.changes.find(
      (candidate) =>
        candidate.collection === "compute_targets" &&
        candidate.key === target.id,
    );
    expect(change?.op).toBe("upsert");
    expect(metadataValue(change?.record, "cuda_visible_devices")).toBe("7");

    const after = await collectionsBootstrap(stack.session);
    const liveTarget = requireRecord(
      after.compute_targets,
      (candidate) => candidate.id === target.id,
      "operator compute target",
    );
    expect(liveTarget.status).toBe("idle");
    expect(metadataValue(liveTarget, "cuda_visible_devices")).toBe("7");
  } finally {
    await stack.close();
  }
});

test("forced scheduler sweep surfaces smoke-style infrastructure stall", async (
  {},
  testInfo,
) => {
  testInfo.setTimeout(60_000);
  const stack = await startSessionStack({ requireAnthropic: false });
  try {
    await rpcRequest(stack.session, "setup.complete", {});
    const seed = (await rpcRequest(
      stack.session,
      "test.seed_smoke_infrastructure_stall",
      {},
    )) as SmokeInfrastructureStallSeed;

    const workflowStatuses = Object.fromEntries(
      seed.stuck_workflow_ids.map((workflowId) => [
        workflowId,
        {
          status: "PENDING",
          name: "situ.task.run_manager",
          error: null,
        },
      ]),
    );
    const outcome = await rpcRequest(stack.session, "test.task_dispatch_sweep_once", {
      workflow_statuses: workflowStatuses,
    });

    expect(outcome.orphan_leases_released_count).toBe(1);
    expect(outcome.stuck_workflows_count).toBe(3);
    expect(outcome.enqueued_count).toBe(0);

    const bootstrap = await collectionsBootstrap(stack.session);
    const session = requireRecord(
      bootstrap.sessions,
      (candidate) => candidate.id === seed.session_id,
      "fixture session",
    );
    expect(session.status).toBe("closed");

    const target = requireRecord(
      bootstrap.compute_targets,
      (candidate) => candidate.id === seed.compute_target_id,
      "fixture compute target",
    );
    expect(target.status).toBe("idle");
    expect(target.claimed_by_task_id).toBeNull();

    const staleTask = requireRecord(
      bootstrap.tasks,
      (candidate) => candidate.id === seed.stale_task_id,
      "stale task",
    );
    expect(staleTask.status).toBe("failed");
    expect(payloadNestedValue(staleTask, "last_infrastructure_failure", "kind")).toBe(
      "stale_compute_lease",
    );

    for (const taskId of seed.stuck_task_ids) {
      const task = requireRecord(
        bootstrap.tasks,
        (candidate) => candidate.id === taskId,
        `stuck task ${taskId}`,
      );
      expect(task.status).toBe("failed");
      expect(payloadNestedValue(task, "last_infrastructure_failure", "kind")).toBe(
        "workflow_unclaimed",
      );
    }

    const runnable = requireRecord(
      bootstrap.tasks,
      (candidate) => candidate.id === seed.runnable_task_id,
      "runnable task",
    );
    expect(runnable.status).toBe("backlog");
    expect(
      bootstrap.events.some((event) => event.type === "session.scheduler_unhealthy"),
    ).toBeTruthy();
    expect(
      bootstrap.events.some((event) => event.type === "session.failed"),
    ).toBeTruthy();
    expect(
      bootstrap.events.some((event) => event.type === "session.completed"),
    ).toBeFalsy();
  } finally {
    await stack.close();
  }
});

test("web client steady-state sync polls durable changes without rebootstrap", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const stack = await startLiveStack({ requireAnthropic: false });
  const rpc = await recordBrowserRpcCalls(page);
  try {
    await page.goto(stack.webUrl);
    await expect(page.getByText("1 projects")).toBeVisible();
    await expect(page.getByText(stack.session.workspace_id)).toBeVisible();

    await page.goto(`${stack.webUrl}/workspaces/${stack.session.workspace_id}`);

    await expect(page.getByText("Connected")).toBeVisible();
    await expect(page.getByText("No session yet")).toBeVisible();
    await rpc.waitFor("collections.subscribe", 1, 20_000);
    await rpc.waitFor("collections.bootstrap", 1, 20_000);
    await rpc.waitFor("collections.changes_since", 1, 20_000);

    const bootstrapCountAfterStartup = rpc.count("collections.bootstrap");
    await rpc.waitFor("collections.changes_since", 2, 20_000);
    await expect(page.getByText("No session yet")).toBeVisible();

    expect(rpc.count("collections.bootstrap")).toBe(bootstrapCountAfterStartup);
    expect(rpc.count("collections.bootstrap")).toBe(1);
  } finally {
    await rpc.stop();
    await stack.close();
  }
});

test("web client reconnect recovery resubscribes and replays without rebootstrap", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const stack = await startLiveStack({ requireAnthropic: false });
  const events = await abortFirstBrowserEventStream(page);
  const rpc = await recordBrowserRpcCalls(page);
  try {
    await page.goto(stack.webUrl);
    await expect(page.getByText("1 projects")).toBeVisible();
    await expect(page.getByText(stack.session.workspace_id)).toBeVisible();

    await page.goto(`${stack.webUrl}/workspaces/${stack.session.workspace_id}`);

    await expect(page.getByText("Connected")).toBeVisible();
    await expect(page.getByText("No session yet")).toBeVisible();
    await rpc.waitFor("collections.bootstrap", 1, 20_000);
    await rpc.waitFor("collections.subscribe", 2, 20_000);
    await rpc.waitFor("collections.changes_since", 2, 20_000);

    expect(events.attempts()).toBeGreaterThanOrEqual(2);
    expect(rpc.count("collections.bootstrap")).toBe(1);
  } finally {
    await rpc.stop();
    await events.stop();
    await stack.close();
  }
});

test("web client receives live agent events from a real session", async ({ page }, testInfo) => {
  testInfo.setTimeout(240_000);
  const stack = await startLiveStack();
  try {
    await page.goto(stack.webUrl);
    await expect(page.getByText("1 projects")).toBeVisible();
    await expect(page.getByText(stack.session.workspace_id)).toBeVisible();

    await page.goto(`${stack.webUrl}/workspaces/${stack.session.workspace_id}`);

    await expect(page.getByText("Connected")).toBeVisible();
    await expect(page.getByText("No session yet")).toBeVisible();

    await rpcRequest(stack.session, "session.start", {
      objective: "Improve the tiny evaluator score",
      research_context: [
        "This is a live Situ E2E smoke test.",
        "Run exactly one concrete experiment.",
        "Use the title `Variant A smoke eval` for the experiment.",
        "Create one hypothesis for variant A.",
        "Run `python eval.py --variant A` with the workspace execute tool.",
        "Record the command output and your interpretation as plaintext evidence.",
        "Close the experiment after recording the result.",
      ].join(" "),
      max_experiments: 1,
    });

    await expect(page.getByRole("link", { name: "Events" })).toBeVisible({
      timeout: 90_000,
    });
    await page.getByRole("link", { name: "Events" }).click();

    await expect(page.getByText("session.started")).toBeVisible();
    await expect(page.getByText("Variant A smoke eval")).toBeVisible({
      timeout: 180_000,
    });
    await expect(page.getByText("experiment.created")).toBeVisible();
    await expect(page.getByText("measurement.added")).toBeVisible({
      timeout: 180_000,
    });
    await expect(page.getByText("experiment.done")).toBeVisible({
      timeout: 180_000,
    });
    await expect(page.getByText("session.critic_completed")).toBeVisible({
      timeout: 180_000,
    });

    const screenshotPath = finalScreenshotPath();
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach("final-snapshot", {
      path: screenshotPath,
      contentType: "image/png",
    });
    console.log(`Situ E2E final screenshot: ${screenshotPath}`);
  } finally {
    await stack.close();
  }
});

test("guided smoke loop dispatches a Scientist task through a compute lease", async (
  {},
  testInfo,
) => {
  testInfo.setTimeout(300_000);
  const stack = await startLiveStack();
  try {
    await rpcRequest(stack.session, "session.start", {
      objective: "Run the guided scheduler and compute lease smoke loop",
      research_context: [
        "This is a live guided Situ E2E smoke test for the DBOS task dispatcher.",
        "The Manager's first planning pass must create exactly one Scientist task.",
        "The task kind must be `baseline`.",
        "The task title must be exactly `Scheduler lease smoke baseline`.",
        "Use the default local compute pool; do not request remote compute.",
        "The Scientist task must load the baseline-task skill, run `python eval.py --variant baseline`, create a baseline titled exactly `Scheduler lease smoke baseline`, create an evaluation for that baseline, record the JSON command output as measurement evidence, link the produced baseline and evaluation to the active task, and submit the baseline and evaluation for review.",
        "Do not create an experiment in this guided smoke test.",
        "After the baseline task has made durable evidence progress, no additional research work is required.",
      ].join(" "),
      max_experiments: 1,
    });

    const withTask = await waitForBootstrap(
      stack.session,
      "Manager-created baseline task",
      (bootstrap) =>
        bootstrap.tasks.some(
          (task) =>
            task.kind === "baseline" &&
            task.title === "Scheduler lease smoke baseline",
        ),
      180_000,
      stack.home,
    );
    const task = requireRecord(
      withTask.tasks,
      (candidate) =>
        candidate.kind === "baseline" &&
        candidate.title === "Scheduler lease smoke baseline",
      "baseline task",
    );

    await waitForBootstrap(
      stack.session,
      "Scientist task claimed a local compute target",
      (bootstrap) =>
        bootstrap.events.some(
          (event) =>
            event.type === "compute_target.claimed" &&
            payloadValue(event, "task_id") === task.id,
        ),
      180_000,
      stack.home,
    );

    const completed = await waitForBootstrap(
      stack.session,
      "Scientist task finished and released compute",
      (bootstrap) => {
        const currentTask = bootstrap.tasks.find((candidate) => candidate.id === task.id);
        const baseline = bootstrap.baselines.find(
          (candidate) => candidate.title === "Scheduler lease smoke baseline",
        );
        return (
          currentTask?.status === "done" &&
          baseline !== undefined &&
          ["in_review", "done"].includes(String(baseline.status)) &&
          bootstrap.events.some(
            (event) =>
              event.type === "compute_target.released" &&
              payloadValue(event, "task_id") === task.id,
          ) &&
          bootstrap.compute_targets.some(
            (target) => target.pool === "local" && target.status === "idle",
          )
        );
      },
      240_000,
      stack.home,
    );

    expect(
      completed.events.some((event) => event.type === "baseline.created"),
    ).toBeTruthy();
    expect(
      completed.events.some((event) => event.type === "task.done"),
    ).toBeTruthy();

    const claim = requireRecord(
      completed.events,
      (event) =>
        event.type === "compute_target.claimed" &&
        payloadValue(event, "task_id") === task.id,
      "compute claim event",
    );
    const targetId = payloadValue(claim, "target_id");
    expect(typeof targetId).toBe("string");

    const receipt = requireRecord(
      completed.artifacts,
      (artifact) =>
        artifact.kind === "command_receipt" &&
        artifact.associated_entity_kind === "task" &&
        artifact.associated_entity_id === task.id,
      "Scientist command receipt",
    );
    const receiptContents = await artifactRead(stack.session, String(receipt.id));
    expect(receiptContents.truncated).toBe(false);
    const receiptPayload = JSON.parse(receiptContents.content) as Record<
      string,
      unknown
    >;
    const commandOutput = String(receiptPayload.output ?? "");
    expect(commandOutput).toContain(`"compute_target_id": "${targetId}"`);
    expect(commandOutput).toContain('"compute_pool": "local"');
  } finally {
    await stack.close();
  }
});

type LiveStackOptions = {
  requireAnthropic?: boolean;
};

async function startLiveStack({
  requireAnthropic = true,
}: LiveStackOptions = {}): Promise<LiveStack> {
  const sessionStack = await startSessionStack({ requireAnthropic });
  const webPort = await getFreePort();
  const webUrl = `http://127.0.0.1:${webPort}`;
  const web = startProcess({
    command: "bun",
    args: ["run", "dev", "--", "--port", String(webPort), "--strictPort"],
    cwd: join(REPO_ROOT, "projects/web"),
    env: sessionStack.env,
  });

  try {
    await waitForHttpOk(webUrl, web);
  } catch (error) {
    await web.stop();
    await sessionStack.close();
    throw error;
  }

  return {
    webUrl,
    session: sessionStack.session,
    home: sessionStack.home,
    close: async () => {
      await web.stop();
      await sessionStack.close();
    },
  };
}

async function startSessionStack({
  requireAnthropic = true,
}: LiveStackOptions = {}): Promise<SessionStack> {
  const anthropicKey = requireAnthropic
    ? requireAnthropicKey()
    : optionalAnthropicKey();
  const logfireToken = optionalLogfireToken();
  const root = makeTempRoot();
  const workspace = join(root, "workspace");
  const home = join(root, "home");
  mkdirSync(workspace, { recursive: true });
  writeSituSecrets({ home, anthropicKey, logfireToken });
  writeTinyEval(workspace);

  const env = {
    ...withoutRuntimeSecrets(process.env),
    HOME: home,
    SITU_TEST_CONTROLS: "1",
    SITU_APP_ROOT: REPO_ROOT,
    SITU_WORKSPACE: workspace,
  };

  const sessionServer = startProcess({
    command: "bun",
    args: ["run", "dev"],
    cwd: join(REPO_ROOT, "projects/session-server"),
    env,
  });

  try {
    const session = await waitForSession({ home, workspace, sessionServer });
    return {
      session,
      home,
      env,
      close: async () => {
        await sessionServer.stop();
        cleanupTempRoot(root);
      },
    };
  } catch (error) {
    await sessionServer.stop();
    cleanupTempRoot(root);
    throw error;
  }
}

function requireAnthropicKey(): string {
  const key = optionalAnthropicKey();
  if (!key) {
    throw new Error(
      "Real-real E2E requires SITU_ANTHROPIC_KEY or ANTHROPIC_API_KEY; no fake model is used.",
    );
  }
  return key;
}

function optionalAnthropicKey(): string | undefined {
  return process.env.SITU_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
}

function optionalLogfireToken(): string | undefined {
  return process.env.SITU_LOGFIRE_TOKEN ?? process.env.LOGFIRE_TOKEN;
}

function writeSituSecrets({
  home,
  anthropicKey,
  logfireToken,
}: {
  home: string;
  anthropicKey?: string;
  logfireToken?: string;
}): void {
  const situHome = join(home, ".situ");
  mkdirSync(situHome, { recursive: true, mode: 0o700 });
  const secrets: Record<string, string> = {};
  if (anthropicKey) {
    secrets.anthropic_key = anthropicKey;
  }
  if (logfireToken) {
    secrets.logfire_token = logfireToken;
  }
  writeFileSync(
    join(situHome, "secrets.json"),
    `${JSON.stringify(secrets, null, 2)}\n`,
    { mode: 0o600 },
  );
}

function withoutRuntimeSecrets(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env };
  delete next.SITU_ANTHROPIC_KEY;
  delete next.ANTHROPIC_API_KEY;
  delete next.SITU_LOGFIRE_TOKEN;
  delete next.LOGFIRE_TOKEN;
  return next;
}

function writeTinyEval(workspace: string): void {
  writeFileSync(
    join(workspace, "eval.py"),
    [
      "import argparse",
      "import json",
      "import os",
      "",
      "parser = argparse.ArgumentParser()",
      "parser.add_argument('--variant', default='baseline')",
      "args = parser.parse_args()",
      "",
      "scores = {'baseline': 0.52, 'A': 0.74}",
      "score = scores.get(args.variant, scores['baseline'])",
      "print(json.dumps({",
      "    'variant': args.variant,",
      "    'score': score,",
      "    'passed': True,",
      "    'compute_target_id': os.environ.get('SITU_COMPUTE_TARGET_ID'),",
      "    'compute_pool': os.environ.get('SITU_COMPUTE_POOL'),",
      "    'compute_target_label': os.environ.get('SITU_COMPUTE_TARGET_LABEL'),",
      "    'cuda_visible_devices': os.environ.get('CUDA_VISIBLE_DEVICES'),",
      "}))",
    ].join("\n"),
  );
  writeFileSync(
    join(workspace, "README.md"),
    [
      "# Tiny Eval Workspace",
      "",
      "Run `python eval.py --variant A` to evaluate variant A.",
      "The command prints JSON with score and Situ compute environment fields.",
    ].join("\n"),
  );
  runChecked("git", ["init"], workspace);
  runChecked("git", ["add", "eval.py", "README.md"], workspace);
  runChecked(
    "git",
    [
      "-c",
      "user.email=situ-e2e@example.local",
      "-c",
      "user.name=Situ E2E",
      "commit",
      "-m",
      "initial tiny eval workspace",
    ],
    workspace,
  );
}

function startProcess({
  command,
  args,
  cwd,
  env,
}: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}): ProcessHandle {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf-8");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf-8");
  });

  return {
    process: child,
    output: () => output,
    stop: () => stopProcess(child),
  };
}

async function waitForSession({
  home,
  workspace,
  sessionServer,
}: {
  home: string;
  workspace: string;
  sessionServer: ProcessHandle;
}): Promise<SessionRecord> {
  const appPath = join(home, ".situ", "app.json");
  const deadline = Date.now() + 15_000;
  let ensured: RuntimeEnsureResult | null = null;
  while (Date.now() < deadline) {
    assertStillRunning(sessionServer);
    const app = readAppRecord({ appPath });
    if (app && (await isHealthy(app.url))) {
      ensured ??= await ensureRuntime({ app, workspace });
      const session = await readProjectSession({
        app,
        workspaceId: ensured.workspace_id,
      });
      if (session) {
        return {
          ...session,
          url: app.url,
        };
      }
    }
    await sleep(50);
  }

  throw new Error(`timed out waiting for session server\n${sessionServer.output()}`);
}

function readAppRecord({ appPath }: { appPath: string }): AppRecord | null {
  try {
    return JSON.parse(readFileSync(appPath, "utf-8")) as AppRecord;
  } catch {
    return null;
  }
}

async function ensureRuntime({
  app,
  workspace,
}: {
  app: AppRecord;
  workspace: string;
}): Promise<RuntimeEnsureResult> {
  return (await appRpcRequest<RuntimeEnsureResult>({
    app,
    method: "app.runtime.ensure",
    params: { workspace },
    workspace,
  }));
}

async function readProjectSession({
  app,
  workspaceId,
}: {
  app: AppRecord;
  workspaceId: string;
}): Promise<Omit<SessionRecord, "url"> | null> {
  const response = await fetch(
    new URL(`/api/projects/${encodeURIComponent(workspaceId)}/session`, app.url),
  );
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as ProjectSessionResponse;
  return payload.session;
}

async function waitForHttpOk(url: string, handle: ProcessHandle): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    assertStillRunning(handle);
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the dev server finishes starting.
    }
    await sleep(50);
  }

  throw new Error(`timed out waiting for ${url}\n${handle.output()}`);
}

async function rpcRequest(
  session: SessionRecord,
  method: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return appRpcRequest({
    app: session,
    method,
    params,
    workspace: session.workspace,
    projectId: session.project_id,
  });
}

async function appRpcRequest<TResult extends Record<string, unknown>>({
  app,
  method,
  params,
  workspace,
  projectId,
}: {
  app: { url: string };
  method: string;
  params: Record<string, unknown>;
  workspace?: string;
  projectId?: string;
}): Promise<TResult> {
  const response = await fetch(new URL("/rpc", app.url), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      method,
      params,
      workspace,
      project_id: projectId,
    }),
  });
  const payload = (await response.json()) as {
    result?: TResult;
    error?: { message?: string };
  };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `RPC ${method} failed`);
  }
  return payload.result ?? ({} as TResult);
}

async function collectionsBootstrap(
  session: SessionRecord,
): Promise<CollectionsBootstrap> {
  return (await rpcRequest(
    session,
    "collections.bootstrap",
    {},
  )) as CollectionsBootstrap;
}

async function collectionsChangesSince(
  session: SessionRecord,
  params: { cursor: number; limit?: number },
): Promise<CollectionsChangesSince> {
  return (await rpcRequest(
    session,
    "collections.changes_since",
    params,
  )) as CollectionsChangesSince;
}

async function artifactRead(
  session: SessionRecord,
  artifactId: string,
): Promise<ArtifactReadResult> {
  return (await rpcRequest(session, "artifacts.read", {
    artifact_id: artifactId,
  })) as ArtifactReadResult;
}

async function waitForBootstrap(
  session: SessionRecord,
  label: string,
  predicate: (bootstrap: CollectionsBootstrap) => boolean,
  timeoutMs: number,
  home?: string,
): Promise<CollectionsBootstrap> {
  const deadline = Date.now() + timeoutMs;
  let latest: CollectionsBootstrap | null = null;
  while (Date.now() < deadline) {
    latest = await collectionsBootstrap(session);
    if (predicate(latest)) {
      return latest;
    }
    await sleep(1_000);
  }
  throw new Error(
    `timed out waiting for ${label}\n${summarizeBootstrap(latest, session, home)}`,
  );
}

function requireRecord(
  records: CollectionRecord[],
  predicate: (record: CollectionRecord) => boolean,
  label: string,
): CollectionRecord {
  const record = records.find(predicate);
  if (!record) {
    throw new Error(`missing ${label}`);
  }
  return record;
}

function payloadValue(record: CollectionRecord, key: string): unknown {
  const payload = record.payload;
  return payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)[key]
    : undefined;
}

function payloadNestedValue(
  record: CollectionRecord,
  objectKey: string,
  valueKey: string,
): unknown {
  const value = payloadValue(record, objectKey);
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[valueKey]
    : undefined;
}

function metadataValue(record: CollectionRecord | null | undefined, key: string): unknown {
  const metadata = record?.metadata;
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>)[key]
    : undefined;
}

function summarizeBootstrap(
  bootstrap: CollectionsBootstrap | null,
  session?: SessionRecord,
  home?: string,
): string {
  if (!bootstrap) {
    return "No collections bootstrap response was received.";
  }
  return JSON.stringify(
    {
      tasks: bootstrap.tasks.map((task) => ({
        id: task.id,
        kind: task.kind,
        title: task.title,
        status: task.status,
        workflow_id: task.workflow_id,
      })),
      baselines: bootstrap.baselines.map((baseline) => ({
        id: baseline.id,
        title: baseline.title,
        status: baseline.status,
      })),
      compute_targets: bootstrap.compute_targets.map((target) => ({
        id: target.id,
        pool: target.pool,
        status: target.status,
        claimed_by_task_id: target.claimed_by_task_id,
      })),
      events: bootstrap.events.slice(-20).map((event) => ({
        id: event.id,
        type: event.type,
        message: event.message,
      })),
      sessions: bootstrap.sessions,
      dbos_workflows:
        session && home ? summarizeDbosWorkflows({ home, projectId: session.project_id }) : [],
    },
    null,
    2,
  );
}

function summarizeDbosWorkflows({
  home,
  projectId,
}: {
  home: string;
  projectId: string;
}): Array<Record<string, unknown>> | string {
  const dbosPath = join(home, ".situ", "projects", projectId, "dbos.sqlite");
  if (!existsSync(dbosPath)) {
    return `DBOS database not found at ${dbosPath}`;
  }
  const script = [
    "import base64, json, pickle, sqlite3, sys",
    "con = sqlite3.connect(sys.argv[1])",
    "con.row_factory = sqlite3.Row",
    "rows = []",
    "for row in con.execute(\"\"\"",
    "SELECT workflow_uuid, status, name, queue_name, error",
    "FROM workflow_status",
    "WHERE workflow_uuid LIKE 'task:%' OR workflow_uuid LIKE 'critic-review:%'",
    "ORDER BY created_at",
    "\"\"\"):",
    "    error = row['error']",
    "    if error:",
    "        try:",
    "            error = str(pickle.loads(base64.b64decode(error)))",
    "        except Exception:",
    "            error = str(error)[:240]",
    "    rows.append({",
    "        'workflow_uuid': row['workflow_uuid'],",
    "        'status': row['status'],",
    "        'name': row['name'],",
    "        'queue_name': row['queue_name'],",
    "        'error': error,",
    "    })",
    "print(json.dumps(rows))",
  ].join("\n");
  const result = spawnSync("python3", ["-c", script, dbosPath], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    return `failed to summarize DBOS workflows: ${result.stderr || result.stdout}`;
  }
  try {
    return JSON.parse(result.stdout) as Array<Record<string, unknown>>;
  } catch {
    return result.stdout.trim();
  }
}

async function isHealthy(url: string): Promise<boolean> {
  try {
    const response = await fetch(new URL("/health", url));
    return response.ok;
  } catch {
    return false;
  }
}

function assertStillRunning(handle: ProcessHandle): void {
  if (handle.process.exitCode !== null) {
    throw new Error(
      `process exited with code ${handle.process.exitCode}\n${handle.output()}`,
    );
  }
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolveStop) => {
      child.once("exit", () => resolveStop());
    }),
    sleep(5_000).then(() => {
      child.kill("SIGKILL");
    }),
  ]);
}

function runChecked(command: string, args: string[], cwd: string): void {
  runCheckedOutput(command, args, cwd);
}

function runCheckedOutput(
  command: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
): { stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`,
    );
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

function makeTempRoot(): string {
  return mkdtempSync(join(tmpdir(), "situ-e2e-"));
}

function cleanupTempRoot(root: string): void {
  if (process.env.SITU_E2E_KEEP_TEMP === "1") {
    console.log(`Preserved Situ E2E temp root: ${root}`);
    return;
  }
  rmSync(root, { recursive: true, force: true });
}

function finalScreenshotPath(name = "live-web-client"): string {
  const root =
    process.env.SITU_E2E_SCREENSHOT_DIR ??
    join(tmpdir(), "situ-e2e-screenshots", timestampSlug());
  mkdirSync(root, { recursive: true });
  return join(root, `${name}-final.png`);
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

type BrowserRpcCall = {
  method: string;
  params?: Record<string, unknown>;
};

type BrowserRpcRecorder = {
  count: (method: string) => number;
  calls: () => BrowserRpcCall[];
  waitFor: (method: string, count: number, timeoutMs: number) => Promise<void>;
  stop: () => Promise<void>;
};

async function recordBrowserRpcCalls(page: Page): Promise<BrowserRpcRecorder> {
  const calls: BrowserRpcCall[] = [];
  const handler = async (route: Route) => {
    try {
      const payload = parseJsonObject(route.request().postData());
      if (typeof payload?.method === "string") {
        calls.push({
          method: payload.method,
          params: isRecord(payload.params) ? payload.params : undefined,
        });
      }
    } finally {
      await route.continue();
    }
  };

  await page.route("**/rpc", handler);

  return {
    count: (method) => calls.filter((call) => call.method === method).length,
    calls: () => [...calls],
    waitFor: async (method, count, timeoutMs) => {
      await expect
        .poll(
          () => calls.filter((call) => call.method === method).length,
          { timeout: timeoutMs },
        )
        .toBeGreaterThanOrEqual(count);
    },
    stop: () => page.unroute("**/rpc", handler),
  };
}

type BrowserEventStreamInterceptor = {
  attempts: () => number;
  stop: () => Promise<void>;
};

async function abortFirstBrowserEventStream(
  page: Page,
): Promise<BrowserEventStreamInterceptor> {
  let attempts = 0;
  const isEventStreamUrl = (url: URL) => url.pathname === "/events";
  const handler = async (route: Route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.abort();
      return;
    }
    await route.continue();
  };

  await page.route(isEventStreamUrl, handler);

  return {
    attempts: () => attempts,
    stop: () => page.unroute(isEventStreamUrl, handler),
  };
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectSequentialCursors(
  changes: CollectionChange[],
  { after }: { after: number },
): void {
  changes.forEach((change, index) => {
    expect(change.cursor).toBe(after + index + 1);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("failed to allocate a local port"));
        return;
      }
      const port = address.port;
      server.close(() => resolvePort(port));
    });
  });
}
