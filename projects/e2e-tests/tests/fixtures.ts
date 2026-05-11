import { test as base, expect } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonModule } from "./modules/json";
import { processModule } from "./modules/process";

export type AppStack = {
  root: string;
  home: string;
  workspace: string;
  url: string;
  env: NodeJS.ProcessEnv;
  close: () => Promise<void>;
};

export type BootstrapResponse = {
  session: {
    id: string;
    repoPath: string;
    workspaceKey: string;
  };
  sessionId: string;
  replicacheName: string;
  workspaceKey: string;
  repoPath: string;
};

export type StatusResponse = {
  agent: unknown | null;
  environment: unknown | null;
  session: unknown | null;
};

export type LocalSettingsResponse = {
  id: string;
  anthropicKeyConfigured: boolean;
};

export type PullPatch =
  | { op: "clear" }
  | { op: "put"; key: string; value: unknown }
  | { op: "del"; key: string };

export type PullResponse = {
  cookie: number;
  patch: PullPatch[];
};

type ProcessHandle = {
  isRunning: () => boolean;
  output: () => string;
  stop: () => Promise<void>;
};

type StackOptions = {
  disableScheduler?: boolean;
  anthropicKey?: string;
  mockAnthropic?: boolean;
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const APP_ROOT = join(REPO_ROOT, "projects", "app");

export const test = base.extend<{ stack: AppStack; stackOptions: StackOptions }>({
  stackOptions: [{ disableScheduler: true }, { option: true }],
  stack: async ({ stackOptions }, use) => {
    const stack = await startApp(stackOptions);
    try {
      await use(stack);
    } finally {
      await stack.close();
    }
  },
});

export { expect };

export async function startApp({
  disableScheduler = false,
  anthropicKey,
  mockAnthropic = true,
}: StackOptions = {}): Promise<AppStack> {
  const root = mkdtempSync(join(tmpdir(), "situ-e2e-"));
  const home = join(root, "home", ".situ");
  const workspacePath = join(root, "workspace");
  mkdirSync(home, { recursive: true });
  mkdirSync(workspacePath, { recursive: true });
  const workspace = realpathSync(workspacePath);
  writeWorkspaceFixture({ workspace });

  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}`;
  const fakeAnthropic = mockAnthropic ? await startFakeAnthropic() : undefined;
  const env = testEnv({
    home,
    workspace,
    disableScheduler,
    anthropicKey,
    anthropicBaseUrl: fakeAnthropic?.url,
  });
  const app = startProcess({
    command: "bun",
    args: ["run", "src/cli.ts", "app", "--host", "127.0.0.1", "--port", String(port)],
    cwd: APP_ROOT,
    env,
  });

  try {
    await waitForHttpOk({ url: `${url}/api/status`, handle: app });
    await waitForHttpOk({ url, handle: app });
    return {
      root,
      home,
      workspace,
      url,
      env,
      close: async () => {
        await app.stop();
        await fakeAnthropic?.close();
        rmSync(root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await app.stop();
    await fakeAnthropic?.close();
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

export async function getJson<T>({ url, path }: { url: string; path: string }): Promise<T> {
  const response = await fetch(new URL(path, url));
  return parseJsonResponse<T>({ response, label: `GET ${path}` });
}

export async function postJson<T = Record<string, unknown>>({
  url,
  path,
  body,
}: {
  url: string;
  path: string;
  body: unknown;
}): Promise<T> {
  const response = await fetch(new URL(path, url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: jsonModule.stringify({ value: body }),
  });
  return parseJsonResponse<T>({ response, label: `POST ${path}` });
}

export async function pullReplicache({
  url,
  cookie,
}: {
  url: string;
  cookie: number;
}): Promise<PullResponse> {
  return postJson<PullResponse>({
    url,
    path: "/api/replicache/pull",
    body: {
      pullVersion: 1,
      schemaVersion: "5",
      profileID: "situ-e2e",
      clientGroupID: "situ-e2e",
      cookie,
    },
  });
}

export function patchValue<T>(pull: PullResponse, key: string): T | undefined {
  const operation = pull.patch.find(
    (candidate): candidate is { op: "put"; key: string; value: unknown } =>
      candidate.op === "put" && candidate.key === key,
  );
  return operation?.value as T | undefined;
}

export function runAppCliJson<T>({ args, env }: { args: string[]; env: NodeJS.ProcessEnv }): T {
  const result = spawnSync("bun", ["run", "src/cli.ts", ...args], {
    cwd: APP_ROOT,
    env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      [`CLI failed: situ ${args.join(" ")}`, result.stdout.trim(), result.stderr.trim()]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return jsonModule.parse<T>({ text: result.stdout });
}

function writeWorkspaceFixture({ workspace }: { workspace: string }): void {
  writeFileSync(
    join(workspace, "README.md"),
    ["# Situ E2E Workspace", "", "Temporary workspace for local app smoke tests.", ""].join("\n"),
  );
}

function testEnv({
  home,
  workspace,
  disableScheduler,
  anthropicKey,
  anthropicBaseUrl,
}: {
  home: string;
  workspace: string;
  disableScheduler: boolean;
  anthropicKey?: string;
  anthropicBaseUrl?: string;
}): NodeJS.ProcessEnv {
  const env = withoutRuntimeSecrets(process.env);
  env.HOME = dirname(home);
  env.SITU_HOME = home;
  env.SITU_REPO_PATH = workspace;
  if (disableScheduler) {
    env.SITU_DISABLE_SCHEDULER = "1";
  }
  if (anthropicKey) {
    env.SITU_ANTHROPIC_KEY = anthropicKey;
  }
  if (anthropicBaseUrl) {
    env.ANTHROPIC_BASE_URL = anthropicBaseUrl;
  }
  return env;
}

function withoutRuntimeSecrets(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env };
  delete next.SITU_ANTHROPIC_KEY;
  delete next.ANTHROPIC_API_KEY;
  delete next.SITU_LOGFIRE_TOKEN;
  delete next.LOGFIRE_TOKEN;
  delete next.ANTHROPIC_BASE_URL;
  delete next.SITU_SECRETS_PATH;
  delete next.SITU_HOME;
  delete next.SITU_DB_PATH;
  delete next.SITU_SESSION_ID;
  delete next.SITU_REPO_PATH;
  delete next.SITU_DISABLE_SCHEDULER;
  return next;
}

async function startFakeAnthropic(): Promise<{ url: string; close: () => Promise<void> }> {
  const port = await getFreePort();
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    const apiKey = request.headers["x-api-key"];
    if (
      request.method === "GET" &&
      url.pathname === "/v1/models" &&
      typeof apiKey === "string" &&
      apiKey.trim().startsWith("sk-ant-")
    ) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        jsonModule.stringify({
          value: {
            data: [
              {
                id: "claude-e2e",
                type: "model",
                display_name: "Claude E2E",
                created_at: "2026-01-01T00:00:00.000Z",
                capabilities: null,
                max_input_tokens: null,
                max_tokens: null,
              },
            ],
            has_more: false,
            first_id: "claude-e2e",
            last_id: "claude-e2e",
          },
        }),
      );
      return;
    }

    response.writeHead(401, { "content-type": "application/json" });
    response.end(jsonModule.stringify({ value: { error: { message: "invalid api key" } } }));
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", () => resolveListen());
  });

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => closeServer({ server }),
  };
}

async function closeServer({ server }: { server: Server }): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) {
        rejectClose(error);
        return;
      }
      resolveClose();
    });
  });
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
    output += chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
  });

  return {
    isRunning: () => processModule.isRunning({ child }),
    output: () => output,
    stop: () => processModule.stop({ child }),
  };
}

async function waitForHttpOk({
  url,
  handle,
}: {
  url: string;
  handle: ProcessHandle;
}): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (!handle.isRunning()) {
      throw new Error(`app process exited before ${url} became healthy\n${handle.output()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until Bun has built assets, migrated SQLite, and started serving.
    }
    await sleep(100);
  }

  throw new Error(`timed out waiting for ${url}\n${handle.output()}`);
}

async function parseJsonResponse<T>({
  response,
  label,
}: {
  response: Response;
  label: string;
}): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `${label} failed with HTTP ${response.status}`);
  }
  return payload;
}

async function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to allocate a TCP port.")));
        return;
      }
      const port = address.port;
      server.close(() => resolvePort(port));
    });
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}
