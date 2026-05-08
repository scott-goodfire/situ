import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import type { ServerResponse } from "node:http";

export async function serveStaticWeb({
  distRoot,
  pathname,
  response,
}: {
  distRoot: string;
  pathname: string;
  response: ServerResponse;
}): Promise<boolean> {
  const staticPath = safeStaticPath({ distRoot, pathname });
  if (!staticPath) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("forbidden");
    return true;
  }

  const file = await readStaticFile({ path: staticPath });
  if (file) {
    response.writeHead(200, { "content-type": file.contentType });
    response.end(file.body);
    return true;
  }

  if (extname(pathname)) {
    return false;
  }

  const index = await readStaticFile({ path: resolve(distRoot, "index.html") });
  if (!index) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Situ web build not found");
    return true;
  }

  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(index.body);
  return true;
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
}): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const fileStat = await stat(path);
    if (!fileStat.isFile()) {
      return null;
    }

    return {
      body: await readFile(path),
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

  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js" || extension === ".mjs") return "text/javascript; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";

  return "application/octet-stream";
}

function isMissingPathError({ error }: { error: unknown }): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
