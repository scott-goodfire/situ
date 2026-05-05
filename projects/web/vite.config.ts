import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";
import { createDiscoveryApi } from "./src/server/discovery-api";

export default defineConfig({
  plugins: [almanacDiscoveryApi()],
});

function almanacDiscoveryApi(): Plugin {
  const api = createDiscoveryApi();

  return {
    name: "almanac-discovery-api",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!isApiRequest({ request })) {
          next();
          return;
        }

        handleApiRequest({ request, response, api }).catch((error: unknown) => {
          response.statusCode = 500;
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

async function handleApiRequest({
  request,
  response,
  api,
}: {
  request: IncomingMessage;
  response: ServerResponse;
  api: ReturnType<typeof createDiscoveryApi>;
}): Promise<void> {
  const fetchRequest = nodeRequestToFetchRequest({ request });
  const fetchResponse = await api.fetch(fetchRequest);

  response.statusCode = fetchResponse.status;
  fetchResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });

  const body = Buffer.from(await fetchResponse.arrayBuffer());
  response.end(body);
}

function nodeRequestToFetchRequest({
  request,
}: {
  request: IncomingMessage;
}): Request {
  const host = request.headers.host ?? "127.0.0.1";
  const url = new URL(request.url ?? "/", `http://${host}`);

  return new Request(url, {
    method: request.method,
    headers: requestHeaders({ request }),
  });
}

function requestHeaders({
  request,
}: {
  request: IncomingMessage;
}): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      headers.set(key, value);
    }
  }

  return headers;
}

function isApiRequest({ request }: { request: IncomingMessage }): boolean {
  const url = request.url ?? "";
  return url === "/api" || url.startsWith("/api/");
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
