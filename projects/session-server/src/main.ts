import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioJsonRpcClient } from "@almanac/rpc-client/stdio";
import type { JsonRpcNotification } from "@almanac/protocol";

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
};

const appRoot = resolve(process.env.ALMANAC_APP_ROOT ?? repoRootFromImport());
const workspace = resolve(process.env.ALMANAC_WORKSPACE ?? process.cwd());
const projectId = projectIdForWorkspace({ value: workspace });
const token = randomBytes(24).toString("base64url");
const command = harnessCommand();
const harness = StdioJsonRpcClient.spawn({
  command: command.command,
  args: command.args,
  cwd: workspace,
  env: {
    ALMANAC_APP_ROOT: appRoot,
    ALMANAC_WORKSPACE: workspace,
  },
});
const clients = new Set<ServerResponse>();

harness.onNotification({
  handler: (notification) => {
    broadcast({ notification });
  },
});

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
    json({
      response,
      status: 200,
      payload: {
        project_id: projectId,
        workspace,
        pid: process.pid,
      },
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/rpc") {
    void handleRpc({ request, response });
    return;
  }

  if (request.method === "GET" && url.pathname === "/events") {
    handleEvents({ request, response });
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
    throw new Error("session server did not bind to a TCP port");
  }
  const record: SessionRecord = {
    project_id: projectId,
    workspace,
    pid: process.pid,
    port: address.port,
    token,
    url: `http://127.0.0.1:${address.port}`,
    started_at: new Date().toISOString(),
  };
  writeSessionRecord({ record });
  console.error(`Almanac session server listening on ${record.url}`);
});

process.on("SIGINT", () => shutdown({ code: 0 }));
process.on("SIGTERM", () => shutdown({ code: 0 }));
process.on("exit", () => {
  removeSessionRecord();
});

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

    const result = await harness.request({
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

function handleEvents({
  request,
  response,
}: {
  request: IncomingMessage;
  response: ServerResponse;
}): void {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  response.write("event: ready\ndata: {}\n\n");
  clients.add(response);
  request.on("close", () => {
    clients.delete(response);
  });
}

function broadcast({ notification }: { notification: JsonRpcNotification }): void {
  const message = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

function harnessCommand(): { command: string; args: string[] } {
  const localHarness = resolve(appRoot, ".venv/bin/almanac-harness-stdio");
  if (existsSync(localHarness)) {
    return { command: localHarness, args: [] };
  }
  return {
    command: "uv",
    args: ["run", "--package", "almanac-harness", "almanac-harness-stdio"],
  };
}

function repoRootFromImport(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../..");
}

function projectIdForWorkspace({ value }: { value: string }): string {
  return createHash("sha256").update(resolve(value)).digest("hex").slice(0, 16);
}

function sessionPath(): string {
  const home = almanacHome();
  return resolve(home, "projects", projectId, "session.json");
}

function almanacHome(): string {
  if (process.env.ALMANAC_HOME) {
    return resolve(process.env.ALMANAC_HOME);
  }

  return resolve(homedir(), ".almanac");
}

function writeSessionRecord({ record }: { record: SessionRecord }): void {
  const path = sessionPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}

function removeSessionRecord(): void {
  rmSync(sessionPath(), { force: true });
}

function setCorsHeaders({ response }: { response: ServerResponse }): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization, content-type");
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
  removeSessionRecord();
  harness.close();
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
