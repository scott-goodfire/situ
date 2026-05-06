import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Hono } from "hono";
import { createDiscoveryApi } from "./discovery-api";

export type LocalWebAppOptions = {
  situHome?: string;
  distDirectory: string;
};

export function createLocalWebApp({
  situHome,
  distDirectory,
}: LocalWebAppOptions): Hono {
  const app = new Hono();
  const api = createDiscoveryApi({ situHome });
  const distRoot = resolve(distDirectory);

  app.route("/", api);

  app.get("*", async (context) => {
    const pathname = new URL(context.req.url).pathname;
    if (pathname.startsWith("/api/")) {
      return context.notFound();
    }

    const staticPath = safeStaticPath({
      distRoot,
      pathname,
    });

    if (!staticPath) {
      return context.text("forbidden", 403);
    }

    const staticResponse = await readStaticFile({
      path: staticPath,
    });
    if (staticResponse) {
      return new Response(staticResponse.body, {
        headers: {
          "content-type": staticResponse.contentType,
        },
        status: 200,
      });
    }

    if (extname(pathname)) {
      return context.notFound();
    }

    const indexResponse = await readStaticFile({
      path: resolve(distRoot, "index.html"),
    });
    if (!indexResponse) {
      return context.text("Situ web build not found", 500);
    }

    return new Response(indexResponse.body, {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
      status: 200,
    });
  });

  return app;
}

function safeStaticPath({
  distRoot,
  pathname,
}: {
  distRoot: string;
  pathname: string;
}): string | null {
  const decodedPath = decodeURIComponent(pathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const staticPath = resolve(distRoot, relativePath);

  if (staticPath !== distRoot && !staticPath.startsWith(`${distRoot}${sep}`)) {
    return null;
  }

  return staticPath;
}

async function readStaticFile({
  path,
}: {
  path: string;
}): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  try {
    const fileStat = await stat(path);
    if (!fileStat.isFile()) {
      return null;
    }

    const buffer = await readFile(path);

    return {
      body: buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer,
      contentType: contentTypeForPath({ path }),
    };
  } catch (error) {
    if (isMissingPathError({ error })) {
      return null;
    }

    throw error;
  }
}

function contentTypeForPath({ path }: { path: string }): string {
  const extension = extname(path);

  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }

  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }

  if (extension === ".js" || extension === ".mjs") {
    return "text/javascript; charset=utf-8";
  }

  if (extension === ".json") {
    return "application/json; charset=utf-8";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  if (extension === ".png") {
    return "image/png";
  }

  return "application/octet-stream";
}

function isMissingPathError({ error }: { error: unknown }): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
