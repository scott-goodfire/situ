import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { JsonRpcNotification } from "@situ/protocol";
import { StdioJsonRpcClient } from "@situ/rpc-client/stdio";

type AppRecord = {
  pid: number;
  port: number;
  token: string;
  url: string;
  started_at: string;
};

type SessionRecord = {
  project_id: string;
  workspace: string;
  pid: number;
  port: number;
  token: string;
  url: string;
  started_at: string;
};

type RpcRequest = {
  method?: string;
  params?: Record<string, unknown>;
  workspace?: string;
  project_id?: string;
};

type RuntimeClient = {
  projectId: string;
  workspace: string;
  harness: StdioJsonRpcClient;
};

type EventClient = {
  response: ServerResponse;
  projectId: string | null;
};

const appRoot = resolve(process.env.SITU_APP_ROOT ?? repoRootFromImport());
const token = randomBytes(24).toString("base64url");
const startedAt = new Date().toISOString();
const runtimes = new Map<string, RuntimeClient>();
const workspaceToProject = new Map<string, string>();
const clients = new Set<EventClient>();
let appRecord: AppRecord | null = null;

const server = createServer((request, response) => {
  setCorsHeaders({ response });
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (!isAuthorized({ request, url })) {
    json({
      response,
      status: 401,
      payload: { error: { message: "unauthorized" } },
    });
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

  json({
    response,
    status: 404,
    payload: { error: { message: "not found" } },
  });
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Situ app server did not bind to a TCP port");
  }
  appRecord = {
    pid: process.pid,
    port: address.port,
    token,
    url: `http://127.0.0.1:${address.port}`,
    started_at: startedAt,
  };
  writeAppRecord({ record: appRecord });
  console.error(`Situ app server listening on ${appRecord.url}`);

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
  removeSessionRecords();
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
      project_id: runtime.projectId,
      workspace: runtime.workspace,
      pid: process.pid,
    },
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
            project_id: runtime.projectId,
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
  let projectId: string | null = url.searchParams.get("project_id");
  const workspace = workspaceFromUrl({ url });
  if (workspace) {
    const runtime = await ensureRuntime({ workspace });
    projectId = runtime.projectId;
  }

  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  response.write("event: ready\ndata: {}\n\n");

  const client: EventClient = { response, projectId };
  clients.add(client);
  request.on("close", () => {
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
  const projectId = projectIdForWorkspace({ value: resolvedWorkspace });
  const existing = runtimes.get(projectId);
  if (existing) {
    return existing;
  }

  const command = harnessCommand();
  const harness = StdioJsonRpcClient.spawn({
    command: command.command,
    args: command.args,
    cwd: resolvedWorkspace,
    env: {
      ...localRuntimeEnv(process.env),
      SITU_APP_ROOT: appRoot,
      SITU_WORKSPACE: resolvedWorkspace,
    },
  });
  const runtime: RuntimeClient = {
    projectId,
    workspace: resolvedWorkspace,
    harness,
  };
  runtimes.set(projectId, runtime);
  workspaceToProject.set(resolvedWorkspace, projectId);
  harness.onNotification({
    handler: (notification) => {
      broadcast({ projectId, notification });
    },
  });
  if (appRecord) {
    writeSessionRecord({
      record: {
        project_id: projectId,
        workspace: resolvedWorkspace,
        pid: process.pid,
        port: appRecord.port,
        token: appRecord.token,
        url: appRecord.url,
        started_at: appRecord.started_at,
      },
    });
  }
  return runtime;
}

function broadcast({
  projectId,
  notification,
}: {
  projectId: string;
  notification: JsonRpcNotification;
}): void {
  const message = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  for (const client of clients) {
    if (client.projectId !== null && client.projectId !== projectId) {
      continue;
    }
    client.response.write(message);
  }
}

function harnessCommand(): { command: string; args: string[] } {
  const localHarness = resolve(appRoot, ".venv/bin/situ-harness-stdio");
  if (existsSync(localHarness)) {
    return { command: localHarness, args: [] };
  }
  return {
    command: "uv",
    args: ["run", "--package", "situ-harness", "situ-harness-stdio"],
  };
}

function localRuntimeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next = { ...env };
  delete next.SITU_OPENAI_KEY;
  delete next.SITU_LOGFIRE_TOKEN;
  delete next.OPENAI_API_KEY;
  delete next.LOGFIRE_TOKEN;
  return next;
}

function repoRootFromImport(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../..");
}

function projectIdForWorkspace({ value }: { value: string }): string {
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

function sessionPath({ projectId }: { projectId: string }): string {
  return resolve(situHome(), "projects", projectId, "session.json");
}

function writeAppRecord({ record }: { record: AppRecord }): void {
  const path = appPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}

function removeAppRecord(): void {
  rmSync(appPath(), { force: true });
}

function writeSessionRecord({ record }: { record: SessionRecord }): void {
  const path = sessionPath({ projectId: record.project_id });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}

function removeSessionRecords(): void {
  for (const projectId of runtimes.keys()) {
    rmSync(sessionPath({ projectId }), { force: true });
  }
}

function setCorsHeaders({ response }: { response: ServerResponse }): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "authorization, content-type",
  );
}

function isAuthorized({
  request,
  url,
}: {
  request: IncomingMessage;
  url: URL;
}): boolean {
  const header = request.headers.authorization ?? "";
  const bearer = bearerToken({ header });
  const queryToken = url.searchParams.get("token") ?? "";

  return bearer === token || queryToken === token;
}

function bearerToken({ header }: { header: string }): string {
  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice("Bearer ".length);
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

function canonicalWorkspace({ value }: { value: string }): string {
  const resolved = resolve(value);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
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
  removeSessionRecords();
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
