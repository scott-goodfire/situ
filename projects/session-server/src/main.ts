import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { JsonRpcNotification } from "@situ/protocol";
import { StdioJsonRpcClient } from "@situ/rpc-client/stdio";
import {
  findProject,
  listProjects,
  projectSession,
  type RuntimeState,
} from "./project-api.js";
import { serveStaticWeb } from "./static-web.js";

type AppRecord = {
  pid: number;
  host: string;
  port: number;
  url: string;
  started_at: string;
  app_root: string;
  situ_harness_stdio?: string;
};

type AppLockRecord = {
  pid: number;
  started_at: string;
};

type RpcRequest = {
  method?: string;
  params?: Record<string, unknown>;
  workspace?: string;
  project_id?: string;
};

type RuntimeClient = {
  workspaceId: string;
  workspace: string;
  startedAt: string;
  harness: StdioJsonRpcClient;
};

type EventClient = {
  response: ServerResponse;
  workspaceId: string | null;
};

type ServerOptions = {
  host: string;
  port: number;
  webDist: string;
};

const appRoot = resolve(process.env.SITU_APP_ROOT ?? repoRootFromImport());
const options = serverOptionsFromArgs({ args: Bun.argv.slice(2) });
const harnessLaunchCommand = harnessCommand();
const startedAt = new Date().toISOString();
const runtimes = new Map<string, RuntimeClient>();
const clients = new Set<EventClient>();
let appRecord: AppRecord | null = null;
let appLockFd: number | null = null;

try {
  failIfLiveAppRecordExists();
  appLockFd = acquireAppLock();
} catch (error) {
  console.error(`Cannot start Situ app: ${errorMessage({ error })}`);
  process.exit(1);
}

const server = createServer((request, response) => {
  setCorsHeaders({ response });
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (!isAuthorized()) {
    json({
      response,
      status: 401,
      payload: { error: { message: "unauthorized" } },
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/projects") {
    handleProjects({ response });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/projects/")) {
    handleProjectApi({ response, url });
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    void handleHealth({ response, url });
    return;
  }

  if (request.method === "POST" && url.pathname === "/rpc") {
    void handleRpc({ request, response });
    return;
  }

  if (request.method === "GET" && url.pathname === "/events") {
    void handleEvents({ request, response, url }).catch((error: unknown) => {
      json({
        response,
        status: 500,
        payload: { error: { message: errorMessage({ error }) } },
      });
    });
    return;
  }

  if (request.method === "GET") {
    void serveStaticWeb({
      distRoot: options.webDist,
      pathname: url.pathname,
      response,
    })
      .then((served) => {
        if (!served) {
          json({
            response,
            status: 404,
            payload: { error: { message: "not found" } },
          });
        }
      })
      .catch((error: unknown) => {
        json({
          response,
          status: 500,
          payload: { error: { message: errorMessage({ error }) } },
        });
      });
    return;
  }

  json({
    response,
    status: 404,
    payload: { error: { message: "not found" } },
  });
});

server.listen(options.port, options.host, () => {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Situ app server did not bind to a TCP port");
  }
  const url = `http://${connectHost({ host: options.host })}:${address.port}`;
  appRecord = {
    pid: process.pid,
    host: options.host,
    port: address.port,
    url,
    started_at: startedAt,
    app_root: appRoot,
    situ_harness_stdio:
      harnessLaunchCommand.command === "uv" ? undefined : harnessLaunchCommand.command,
  };
  writeAppRecord({ record: appRecord });
  console.error(`Situ app server listening on ${url}`);
  console.error(`Situ web project home: ${url}/`);

  const startupWorkspace = process.env.SITU_WORKSPACE;
  if (startupWorkspace) {
    void ensureRuntime({ workspace: startupWorkspace }).catch((error: unknown) => {
      console.error(errorMessage({ error }));
    });
  }
});

process.on("SIGINT", () => shutdown({ code: 0 }));
process.on("SIGTERM", () => shutdown({ code: 0 }));
process.on("exit", () => {
  removeAppRecord();
  releaseAppLock();
});

async function handleHealth({
  response,
  url,
}: {
  response: ServerResponse;
  url: URL;
}): Promise<void> {
  const workspace = workspaceFromUrl({ url });
  if (!workspace) {
    json({
      response,
      status: 200,
      payload: {
        app: true,
        pid: process.pid,
        runtimes: runtimes.size,
      },
    });
    return;
  }

  const runtime = await ensureRuntime({ workspace });
  json({
    response,
    status: 200,
    payload: {
      app: true,
      workspace_id: runtime.workspaceId,
      workspace: runtime.workspace,
      pid: process.pid,
    },
  });
}

function handleProjects({ response }: { response: ServerResponse }): void {
  json({
    response,
    status: 200,
    payload: {
      projects: listProjects({
        getRuntime: runtimeStateForWorkspace,
        listRuntimes: runtimeStates,
        situHome: situHome(),
      }),
    },
  });
}

function handleProjectApi({
  response,
  url,
}: {
  response: ServerResponse;
  url: URL;
}): void {
  const match = /^\/api\/projects\/([^/]+)(?:\/session)?$/.exec(url.pathname);
  if (!match) {
    json({
      response,
      status: 404,
      payload: { error: { message: "not found" } },
    });
    return;
  }

  const projectId = decodeURIComponent(match[1] ?? "");
  const project = findProject({
    getRuntime: runtimeStateForWorkspace,
    projectId,
    situHome: situHome(),
  });

  if (url.pathname.endsWith("/session")) {
    json({
      response,
      status: 200,
      payload: {
        project,
        session: project
          ? projectSession({
              getRuntime: runtimeStateForWorkspace,
              project,
            })
          : null,
      },
    });
    return;
  }

  json({
    response,
    status: project ? 200 : 404,
    payload: { project },
  });
}

async function handleRpc({
  request,
  response,
}: {
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  try {
    const body = (await readJson({ request })) as RpcRequest;
    if (!body.method) {
      json({
        response,
        status: 400,
        payload: { error: { message: "missing RPC method" } },
      });
      return;
    }

    if (body.method === "app.runtime.ensure") {
      const workspace = workspaceFromBody({ body });
      if (!workspace) {
        throw new Error("workspace is required");
      }
      const runtime = await ensureRuntime({ workspace });
      json({
        response,
        status: 200,
        payload: {
          result: {
            project_id: runtime.workspaceId,
            workspace_id: runtime.workspaceId,
            workspace: runtime.workspace,
          },
        },
      });
      return;
    }

    const appResult = appRpcResult({ body });
    if (appResult.handled) {
      json({
        response,
        status: 200,
        payload: { result: appResult.result },
      });
      return;
    }

    const runtime = await runtimeFromRequest({ body });
    const result = await runtime.harness.request({
      method: body.method,
      params: body.params ?? {},
    });
    json({
      response,
      status: 200,
      payload: { result },
    });
  } catch (error) {
    json({
      response,
      status: 500,
      payload: {
        error: { message: errorMessage({ error }) },
      },
    });
  }
}

async function handleEvents({
  request,
  response,
  url,
}: {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
}): Promise<void> {
  let workspaceId: string | null = url.searchParams.get("workspace_id");
  const workspace = workspaceFromUrl({ url });
  if (workspace) {
    const runtime = await ensureRuntime({ workspace });
    workspaceId = runtime.workspaceId;
  }

  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  response.write("event: ready\ndata: {}\n\n");

  const client: EventClient = { response, workspaceId };
  const heartbeat = setInterval(() => {
    try {
      response.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      clients.delete(client);
    }
  }, 10_000);
  clients.add(client);
  request.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
}

function appRpcResult({ body }: { body: RpcRequest }):
  | { handled: true; result: Record<string, unknown> }
  | { handled: false } {
  if (body.method === "app.health") {
    return {
      handled: true,
      result: {
        app: true,
        pid: process.pid,
        runtimes: runtimes.size,
      },
    };
  }

  return { handled: false };
}

async function runtimeFromRequest({
  body,
}: {
  body: RpcRequest;
}): Promise<RuntimeClient> {
  const workspace = workspaceFromBody({ body });
  if (workspace) {
    return ensureRuntime({ workspace });
  }

  if (body.project_id) {
    const runtime = runtimes.get(body.project_id);
    if (runtime) {
      return runtime;
    }
  }

  throw new Error("workspace or live project_id is required for project RPC");
}

async function ensureRuntime({ workspace }: { workspace: string }): Promise<RuntimeClient> {
  const resolvedWorkspace = canonicalWorkspace({ value: workspace });
  const workspaceId = workspaceIdForPath({ value: resolvedWorkspace });
  const existing = runtimes.get(workspaceId);
  if (existing) {
    return existing;
  }

  const harness = StdioJsonRpcClient.spawn({
    command: harnessLaunchCommand.command,
    args: harnessLaunchCommand.args,
    cwd: resolvedWorkspace,
    env: {
      ...localRuntimeEnv(process.env),
      SITU_APP_ROOT: appRoot,
      SITU_WORKSPACE: resolvedWorkspace,
    },
  });
  const runtime: RuntimeClient = {
    workspaceId,
    workspace: resolvedWorkspace,
    startedAt: new Date().toISOString(),
    harness,
  };
  runtimes.set(workspaceId, runtime);
  harness.onNotification({
    handler: (notification) => {
      broadcast({ workspaceId, notification });
    },
  });
  return runtime;
}

function broadcast({
  workspaceId,
  notification,
}: {
  workspaceId: string;
  notification: JsonRpcNotification;
}): void {
  const message = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  for (const client of clients) {
    if (client.workspaceId !== null && client.workspaceId !== workspaceId) {
      continue;
    }
    client.response.write(message);
  }
}

function harnessCommand(): { command: string; args: string[] } {
  const configuredHarness = process.env.SITU_HARNESS_STDIO;
  if (configuredHarness && existsSync(configuredHarness)) {
    return { command: configuredHarness, args: [] };
  }

  for (const candidate of harnessExecutableCandidates()) {
    if (existsSync(candidate)) {
      return { command: candidate, args: [] };
    }
  }
  return {
    command: "uv",
    args: [
      "run",
      "--project",
      appRoot,
      "--package",
      "situ-harness",
      "situ-harness-stdio",
    ],
  };
}

function harnessExecutableCandidates(): string[] {
  const scriptName =
    process.platform === "win32" ? "situ-harness-stdio.exe" : "situ-harness-stdio";
  const bundledDir = dirname(process.execPath);
  return [
    resolve(appRoot, ".venv/bin", scriptName),
    // Installed CLI layout:
    // <venv>/lib/pythonX/site-packages/situ/_bundled/session-server
    // <venv>/bin/situ-harness-stdio
    resolve(bundledDir, "../../../../..", "bin", scriptName),
  ];
}

function localRuntimeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env };
  delete next.SITU_ANTHROPIC_KEY;
  delete next.SITU_LOGFIRE_TOKEN;
  delete next.ANTHROPIC_API_KEY;
  delete next.LOGFIRE_TOKEN;
  return next;
}

function repoRootFromImport(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../..");
}

function workspaceIdForPath({ value }: { value: string }): string {
  return createHash("sha256")
    .update(canonicalWorkspace({ value }))
    .digest("hex")
    .slice(0, 16);
}

function situHome(): string {
  return resolve(homedir(), ".situ");
}

function appPath(): string {
  return resolve(situHome(), "app.json");
}

function appLockPath(): string {
  return resolve(situHome(), "app.lock");
}

function acquireAppLock(): number {
  const path = appLockPath();
  mkdirSync(dirname(path), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(path, "wx");
      const record: AppLockRecord = {
        pid: process.pid,
        started_at: startedAt,
      };
      writeFileSync(fd, `${JSON.stringify(record, null, 2)}\n`);
      return fd;
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }
      const record = readAppLockRecord();
      if (record && processIsAlive(record.pid)) {
        throw new Error(
          `another Situ app is already running (pid ${record.pid}); stop it before starting a new one`,
        );
      }
      rmSync(path, { force: true });
    }
  }

  throw new Error("could not acquire Situ app lock");
}

function releaseAppLock(): void {
  if (appLockFd !== null) {
    closeSync(appLockFd);
    appLockFd = null;
  }
  const record = readAppLockRecord();
  if (!record || record.pid === process.pid) {
    rmSync(appLockPath(), { force: true });
  }
}

function failIfLiveAppRecordExists(): void {
  const record = readAppRecord();
  if (!record) {
    return;
  }
  if (processIsAlive(record.pid)) {
    throw new Error(
      `another Situ app is already running at ${record.url} (pid ${record.pid}); stop it before starting a new one`,
    );
  }
  rmSync(appPath(), { force: true });
}

function readAppRecord(): AppRecord | null {
  try {
    return JSON.parse(readFileSync(appPath(), "utf8")) as AppRecord;
  } catch {
    return null;
  }
}

function readAppLockRecord(): AppLockRecord | null {
  try {
    return JSON.parse(readFileSync(appLockPath(), "utf8")) as AppLockRecord;
  } catch {
    return null;
  }
}

function processIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isPermissionError(error);
  }
}

function isFileExistsError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EEXIST"
  );
}

function isPermissionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EPERM"
  );
}

function writeAppRecord({ record }: { record: AppRecord }): void {
  const path = appPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}

function removeAppRecord(): void {
  rmSync(appPath(), { force: true });
}

function setCorsHeaders({ response }: { response: ServerResponse }): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "authorization, content-type",
  );
}

function isAuthorized(): boolean {
  // Situ currently runs as a local/pod-local app server. Auth is intentionally
  // disabled until the remote-access token model is designed.
  return true;
}

function workspaceFromBody({ body }: { body: RpcRequest }): string | null {
  return typeof body.workspace === "string" && body.workspace
    ? canonicalWorkspace({ value: body.workspace })
    : null;
}

function workspaceFromUrl({ url }: { url: URL }): string | null {
  const workspace = url.searchParams.get("workspace");
  return workspace ? canonicalWorkspace({ value: workspace }) : null;
}

function runtimeStateForWorkspace(workspaceId: string): RuntimeState | undefined {
  const runtime = runtimes.get(workspaceId);
  if (!runtime) {
    return undefined;
  }

  return {
    workspaceId: runtime.workspaceId,
    workspace: runtime.workspace,
    startedAt: runtime.startedAt,
  };
}

function runtimeStates(): RuntimeState[] {
  return Array.from(runtimes.values()).map((runtime) => ({
    workspaceId: runtime.workspaceId,
    workspace: runtime.workspace,
    startedAt: runtime.startedAt,
  }));
}

function canonicalWorkspace({ value }: { value: string }): string {
  const resolved = resolve(value);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function serverOptionsFromArgs({ args }: { args: string[] }): ServerOptions {
  return {
    host: stringFlag({ args, name: "--host", fallback: "127.0.0.1" }),
    port: numberFlag({ args, name: "--port", fallback: 0 }),
    webDist: resolve(
      stringFlag({
        args,
        name: "--web-dist",
        fallback: resolve(appRoot, "projects", "web", "dist"),
      }),
    ),
  };
}

function stringFlag({
  args,
  name,
  fallback,
}: {
  args: string[];
  name: string;
  fallback: string;
}): string {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }

  return args[index + 1] ?? fallback;
}

function numberFlag({
  args,
  name,
  fallback,
}: {
  args: string[];
  name: string;
  fallback: number;
}): number {
  const parsed = Number.parseInt(
    stringFlag({ args, name, fallback: String(fallback) }),
    10,
  );
  return Number.isNaN(parsed) ? fallback : parsed;
}

function connectHost({ host }: { host: string }): string {
  if (host === "0.0.0.0" || host === "::") {
    return "127.0.0.1";
  }

  return host;
}

function json({
  response,
  status,
  payload,
}: {
  response: ServerResponse;
  status: number;
  payload: unknown;
}): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readJson({ request }: { request: IncomingMessage }): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(bufferFromChunk({ chunk }));
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (text.length === 0) {
    return {};
  }

  return JSON.parse(text);
}

function bufferFromChunk({ chunk }: { chunk: string | Buffer }): Buffer {
  if (Buffer.isBuffer(chunk)) {
    return chunk;
  }

  return Buffer.from(chunk);
}

function shutdown({ code }: { code: number }): void {
  removeAppRecord();
  for (const runtime of runtimes.values()) {
    runtime.harness.close();
  }
  server.close(() => {
    process.exit(code);
  });
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
