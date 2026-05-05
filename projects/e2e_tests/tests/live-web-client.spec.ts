import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
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
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";

type SessionRecord = {
  project_id: string;
  workspace: string;
  pid: number;
  port: number;
  token: string;
  url: string;
  started_at: string;
};

type ProcessHandle = {
  process: ChildProcess;
  output: () => string;
  stop: () => Promise<void>;
};

type LiveStack = {
  webUrl: string;
  session: SessionRecord;
  close: () => Promise<void>;
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("web client receives live agent events from a real session", async ({ page }, testInfo) => {
  const stack = await startLiveStack();
  try {
    await page.goto(stack.webUrl);
    await expect(page.getByText("Local Almanac Projects")).toBeVisible();
    await expect(page.getByText(stack.session.project_id)).toBeVisible();

    await page.goto(`${stack.webUrl}/projects/${stack.session.project_id}`);

    await expect(page.getByText("Connected")).toBeVisible();
    await expect(page.getByText("No session yet")).toBeVisible();

    await rpcRequest(stack.session, "session.start", {
      objective: "Improve the tiny evaluator score",
      research_context: [
        "This is a live Almanac E2E smoke test.",
        "Run exactly one concrete experiment.",
        "Use the title `Variant A smoke eval` for the experiment.",
        "Create one hypothesis for variant A.",
        "Run `python eval.py --variant A` with the workspace execute tool.",
        "Record the command output and your interpretation as plaintext evidence.",
        "Close the experiment after recording the result.",
      ].join(" "),
      max_experiments: 1,
    });

    await expect(page.getByText("session.started")).toBeVisible();
    await expect(page.getByText("Variant A smoke eval")).toBeVisible();
    await expect(page.getByText("experiment.created")).toBeVisible();
    await expect(page.getByText("experiment.comment_added")).toBeVisible();
    await expect(page.getByText("session.completed")).toBeVisible();
    await expect(
      page.getByText(/session_0001 \| closed \| hypotheses [1-9]\d* \| experiments [1-9]\d*/),
    ).toBeVisible();

    const screenshotPath = finalScreenshotPath();
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach("final-snapshot", {
      path: screenshotPath,
      contentType: "image/png",
    });
    console.log(`Almanac E2E final screenshot: ${screenshotPath}`);
  } finally {
    await stack.close();
  }
});

async function startLiveStack(): Promise<LiveStack> {
  const openaiKey = requireOpenAIKey();
  const root = makeTempRoot();
  const workspace = join(root, "workspace");
  const home = join(root, "home");
  mkdirSync(workspace, { recursive: true });
  mkdirSync(home, { recursive: true });
  writeTinyEval(workspace);

  const env = {
    ...process.env,
    HOME: home,
    ALMANAC_APP_ROOT: REPO_ROOT,
    ALMANAC_WORKSPACE: workspace,
    ALMANAC_OPENAI_KEY: openaiKey,
    OPENAI_API_KEY: openaiKey,
  };

  const sessionServer = startProcess({
    command: "bun",
    args: ["run", "dev"],
    cwd: join(REPO_ROOT, "projects/session-server"),
    env,
  });

  try {
    const session = await waitForSession({ home, workspace, sessionServer });
    const webPort = await getFreePort();
    const webUrl = `http://127.0.0.1:${webPort}`;
    const web = startProcess({
      command: "bun",
      args: ["run", "dev", "--", "--port", String(webPort), "--strictPort"],
      cwd: join(REPO_ROOT, "projects/web"),
      env,
    });

    try {
      await waitForHttpOk(webUrl, web);
    } catch (error) {
      await web.stop();
      throw error;
    }

    return {
      webUrl,
      session,
      close: async () => {
        await web.stop();
        await sessionServer.stop();
        rmSync(root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await sessionServer.stop();
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function requireOpenAIKey(): string {
  const key = process.env.ALMANAC_OPENAI_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "Real-real E2E requires ALMANAC_OPENAI_KEY or OPENAI_API_KEY; no fake model is used.",
    );
  }
  return key;
}

function writeTinyEval(workspace: string): void {
  writeFileSync(
    join(workspace, "eval.py"),
    [
      "import argparse",
      "import json",
      "",
      "parser = argparse.ArgumentParser()",
      "parser.add_argument('--variant', default='baseline')",
      "args = parser.parse_args()",
      "",
      "scores = {'baseline': 0.52, 'A': 0.74}",
      "score = scores.get(args.variant, scores['baseline'])",
      "print(json.dumps({'variant': args.variant, 'score': score, 'passed': True}))",
    ].join("\n"),
  );
  writeFileSync(
    join(workspace, "README.md"),
    [
      "# Tiny Eval Workspace",
      "",
      "Run `python eval.py --variant A` to evaluate variant A.",
      "The command prints JSON with `variant`, `score`, and `passed` fields.",
    ].join("\n"),
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
  const sessionPath = join(
    home,
    ".almanac",
    "projects",
    projectIdForWorkspace(workspace),
    "session.json",
  );
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    assertStillRunning(sessionServer);
    if (existsSync(sessionPath)) {
      const session = JSON.parse(readFileSync(sessionPath, "utf-8")) as SessionRecord;
      if (await isHealthy(session)) {
        return session;
      }
    }
    await sleep(50);
  }

  throw new Error(`timed out waiting for session server\n${sessionServer.output()}`);
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
  const response = await fetch(new URL("/rpc", session.url), {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ method, params }),
  });
  const payload = (await response.json()) as {
    result?: Record<string, unknown>;
    error?: { message?: string };
  };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `RPC ${method} failed`);
  }
  return payload.result ?? {};
}

async function isHealthy(session: SessionRecord): Promise<boolean> {
  try {
    const response = await fetch(new URL("/health", session.url), {
      headers: {
        authorization: `Bearer ${session.token}`,
      },
    });
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

function projectIdForWorkspace(workspace: string): string {
  return createHash("sha256").update(resolve(workspace)).digest("hex").slice(0, 16);
}

function makeTempRoot(): string {
  return mkdtempSync(join(tmpdir(), "almanac-e2e-"));
}

function finalScreenshotPath(): string {
  const root =
    process.env.ALMANAC_E2E_SCREENSHOT_DIR ??
    join(tmpdir(), "almanac-e2e-screenshots", timestampSlug());
  mkdirSync(root, { recursive: true });
  return join(root, "live-web-client-final.png");
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
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
