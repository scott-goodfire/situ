import { afterEach, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { JsonRpcNotification } from "@situ/protocol";
import { HttpJsonRpcClient } from "./http.js";

let server: Server | undefined;

afterEach(async () => {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  server = undefined;
});

test("emits a client error when the event stream closes", async () => {
  server = createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    response.write("event: ready\ndata: {}\n\n");
    response.end();
  });

  await new Promise<void>((resolve) => {
    server?.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  const client = new HttpJsonRpcClient({
    baseUrl: `http://127.0.0.1:${address.port}`,
    token: "test-token",
  });

  const notification = await new Promise<JsonRpcNotification>((resolve) => {
    const unsubscribe = client.onNotification({
      handler: (candidate: JsonRpcNotification) => {
        if (candidate.method !== "client.error") {
          return;
        }

        unsubscribe();
        client.close();
        resolve(candidate);
      },
    });
  });

  expect(notification.method).toBe("client.error");
  expect(notification.params).toEqual({
    message: "event stream closed",
  });
});
