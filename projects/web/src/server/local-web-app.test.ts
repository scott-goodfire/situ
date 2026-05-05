import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalWebApp } from "./local-web-app";

describe("local web app", () => {
  test("serves built assets and falls back to the SPA for project routes", async () => {
    await withTemporaryDist(async ({ distDirectory }) => {
      writeFileSync(join(distDirectory, "index.html"), "<main>Almanac shell</main>");
      mkdirSync(join(distDirectory, "assets"));
      writeFileSync(join(distDirectory, "assets", "app.js"), "console.log('ok');");

      const app = createLocalWebApp({
        almanacHome: join(distDirectory, ".almanac"),
        distDirectory,
      });
      const rootResponse = await app.request("/");
      const assetResponse = await app.request("/assets/app.js");
      const projectResponse = await app.request("/projects/0123456789abcdef");

      expect(rootResponse.status).toBe(200);
      expect(await rootResponse.text()).toBe("<main>Almanac shell</main>");
      expect(assetResponse.headers.get("content-type")).toContain("text/javascript");
      expect(await assetResponse.text()).toBe("console.log('ok');");
      expect(projectResponse.status).toBe(200);
      expect(await projectResponse.text()).toBe("<main>Almanac shell</main>");
    });
  });

  test("keeps api routes on the discovery api", async () => {
    await withTemporaryDist(async ({ distDirectory }) => {
      writeFileSync(join(distDirectory, "index.html"), "<main>Almanac shell</main>");

      const app = createLocalWebApp({
        almanacHome: join(distDirectory, ".almanac"),
        distDirectory,
      });
      const response = await app.request("/api/projects");
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toEqual({ projects: [] });
    });
  });
});

async function withTemporaryDist(
  run: ({ distDirectory }: { distDirectory: string }) => Promise<void>,
): Promise<void> {
  const distDirectory = mkdtempSync(join(tmpdir(), "almanac-web-dist-"));

  try {
    await run({ distDirectory });
  } finally {
    rmSync(distDirectory, { recursive: true, force: true });
  }
}
