import { afterEach, describe, expect, test } from "bun:test";

import { serveWithPortFallback } from "./server-listen";

let servers: ReturnType<typeof Bun.serve>[] = [];

describe("serveWithPortFallback", () => {
  afterEach(() => {
    for (const server of servers) {
      server.stop(true);
    }
    servers = [];
  });

  test("uses the requested port when it is available", () => {
    const port = freePort();
    const server = startWithFallback({ port, allowPortFallback: true });

    expect(server.port).toBe(port);
  });

  test("falls forward when the requested default port is busy", () => {
    const port = adjacentFreePort();
    start({ port });

    const server = startWithFallback({ port, allowPortFallback: true, maxAttempts: 2 });

    expect(server.port).toBe(port + 1);
  });

  test("does not fall forward for explicit ports", () => {
    const port = freePort();
    start({ port });

    expect(() => startWithFallback({ port, allowPortFallback: false })).toThrow(
      `Failed to start server. Is port ${port} in use?`,
    );
  });
});

function startWithFallback({
  port,
  allowPortFallback,
  maxAttempts,
}: {
  port: number;
  allowPortFallback: boolean;
  maxAttempts?: number;
}): ReturnType<typeof Bun.serve> {
  const server = serveWithPortFallback({
    hostname: "127.0.0.1",
    port,
    allowPortFallback,
    maxAttempts,
    fetch: () => new Response("ok"),
  });
  servers.push(server);
  return server;
}

function start({ port }: { port: number }): ReturnType<typeof Bun.serve> {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    fetch: () => new Response("ok"),
  });
  servers.push(server);
  return server;
}

function freePort(): number {
  const server = start({ port: 0 });
  const port = server.port;
  server.stop(true);
  servers = servers.filter((stored) => stored !== server);
  if (port === undefined) {
    throw new Error("Bun did not assign a TCP port.");
  }
  return port;
}

function adjacentFreePort(): number {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const port = freePort();
    if (port >= 65535) {
      continue;
    }
    const nextServer = tryStart({ port: port + 1 });
    if (nextServer) {
      nextServer.stop(true);
      servers = servers.filter((stored) => stored !== nextServer);
      return port;
    }
  }
  throw new Error("Unable to find adjacent free ports for server fallback test.");
}

function tryStart({ port }: { port: number }): ReturnType<typeof Bun.serve> | undefined {
  try {
    return start({ port });
  } catch {
    return undefined;
  }
}
