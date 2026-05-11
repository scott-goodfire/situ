import { createServer as createTcpServer } from "node:net";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import type { ViteDevServer } from "vite";

export type ViteDevHandler = {
  fetch: (request: Request) => Promise<Response>;
  close: () => Promise<void>;
};

export async function createViteDevHandler({ root }: { root: string }): Promise<ViteDevHandler> {
  const hmrPort = await findAvailableTcpPort();
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true, hmr: { port: hmrPort } },
    appType: "spa",
  });

  return {
    fetch: (request) => bridgeViteFetch({ vite, request }),
    close: () => vite.close(),
  };
}

async function bridgeViteFetch({
  vite,
  request,
}: {
  vite: ViteDevServer;
  request: Request;
}): Promise<Response> {
  const { req, res } = toReqRes(request);
  stripSecFetchHeaders({ req });
  const responsePromise = toFetchResponse(res);

  return new Promise<Response>((resolve, reject) => {
    vite.middlewares(req, res, (error?: unknown) => {
      if (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (!res.writableEnded) {
        resolve(new Response("Not Found", { status: 404 }));
      }
    });

    responsePromise.then(resolve).catch(reject);
  });
}

async function findAvailableTcpPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createTcpServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || address === null) {
        server.close(() => reject(new Error("Unable to allocate Vite HMR port")));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

function stripSecFetchHeaders({ req }: { req: { headers: Record<string, unknown> } }): void {
  for (const key of Object.keys(req.headers)) {
    if (key.toLowerCase().startsWith("sec-fetch-")) {
      delete req.headers[key];
    }
  }
}
