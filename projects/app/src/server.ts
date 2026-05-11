import { resolve } from "node:path";
import { Hono } from "hono";
import { apiRoutes } from "./routes";
import { contentTypeModule } from "./modules/content-type";
import { logModule } from "./modules/log";
import { installObservabilityMiddleware, obs } from "./observability";
import type { ViteDevHandler } from "./spa";

export type AppMode = { kind: "dev"; vite: ViteDevHandler } | { kind: "prod"; webRoot: string };

export function createApp({ mode }: { mode: AppMode }): Hono {
  const app = new Hono();
  installObservabilityMiddleware({ app });

  app.onError((error, c) => {
    logModule.error(obs.log.http.requestFailed, { error });
    return c.json({ error: error.message }, 500);
  });

  app.route("/api", apiRoutes());

  if (mode.kind === "dev") {
    const handler = mode.vite;
    app.all("*", (c) => handler.fetch(c.req.raw));
    return app;
  }

  mountStaticSpa({ app, webRoot: mode.webRoot });
  return app;
}

function mountStaticSpa({ app, webRoot }: { app: Hono; webRoot: string }): void {
  app.get("/assets/*", async (c) => {
    const name = safeAssetName({ path: c.req.path.slice(1) });
    return webAssetResponse({
      webRoot,
      name,
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": contentTypeModule.forName({ name }),
      },
    });
  });

  app.get("*", async (c) => {
    const url = new URL(c.req.url);
    if (url.pathname !== "/") {
      const name = safeAssetName({ path: url.pathname.slice(1) });
      const file = webFile({ webRoot, name });
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "cache-control": "no-store",
            "content-type": contentTypeModule.forName({ name }),
          },
        });
      }
    }
    return c.html(await webFile({ webRoot, name: "index.html" }).text(), {
      headers: { "cache-control": "no-store" },
    });
  });
}

function webFile({
  webRoot,
  name,
}: {
  webRoot: string;
  name: string;
}): ReturnType<typeof Bun.file> {
  return Bun.file(resolve(webRoot, name));
}

async function webAssetResponse({
  webRoot,
  name,
  headers,
}: {
  webRoot: string;
  name: string;
  headers: HeadersInit;
}): Promise<Response> {
  const file = webFile({ webRoot, name });
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(file, { headers });
}

function safeAssetName({ path }: { path: string }): string {
  const name = path.replace(/^\/+/, "");
  if (!name || name.split("/").includes("..")) {
    throw new Error(`Invalid web asset path: ${path}`);
  }
  return name;
}
