import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig, type Plugin } from "vite";

type AppRecord = {
  url: string;
};

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(webRoot, "../..");
const workspaceNodeModules = path.join(workspaceRoot, "node_modules");
const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export default defineConfig({
  plugins: [vanillaExtractPlugin(), situAppProxy()],
  resolve: {
    alias: {
      react: path.join(workspaceNodeModules, "react"),
      "react-dom": path.join(workspaceNodeModules, "react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
});

function situAppProxy(): Plugin {
  return {
    name: "situ-app-proxy",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!isAppRequest({ request })) {
          next();
          return;
        }

        proxyAppRequest({ request, response }).catch((error: unknown) => {
          response.statusCode = 502;
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({
              error: {
                message: errorMessage({ error }),
              },
            }),
          );
        });
      });
    },
  };
}

async function proxyAppRequest({
  request,
  response,
}: {
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  const app = await readAppRecord();
  const target = new URL(request.url ?? "/", app.url);
  const proxied = await fetch(target, {
    method: request.method,
    headers: requestHeaders({ request }),
    body: await requestBody({ request }),
  });

  response.statusCode = proxied.status;
  proxied.headers.forEach((value, key) => {
    if (hopByHopHeaders.has(key.toLowerCase())) {
      return;
    }
    response.setHeader(key, value);
  });

  if (!proxied.body) {
    response.end();
    return;
  }

  const reader = proxied.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      response.end();
      return;
    }
    response.write(Buffer.from(value));
  }
}

async function readAppRecord(): Promise<AppRecord> {
  const raw = await readFile(path.join(homedir(), ".situ", "app.json"), "utf-8");
  const app = JSON.parse(raw) as unknown;
  if (!isRecord(app) || typeof app.url !== "string") {
    throw new Error("no active Situ app found; run situ app");
  }
  return { url: app.url };
}

function requestHeaders({ request }: { request: IncomingMessage }): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (key.toLowerCase() === "host" || value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }
    headers.set(key, value);
  }

  return headers;
}

async function requestBody({
  request,
}: {
  request: IncomingMessage;
}): Promise<ArrayBuffer | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const body = Buffer.concat(chunks);
  return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
}

function isAppRequest({ request }: { request: IncomingMessage }): boolean {
  const pathname = (request.url ?? "").split("?", 1)[0];
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/rpc" ||
    pathname === "/events" ||
    pathname === "/health"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
