import { resolve } from "node:path";
import { sourceSpaDistPath, sourceSpaRootPath } from "./assets";

export async function buildSpaAssets(): Promise<void> {
  const result = Bun.spawnSync({
    cmd: ["bun", "x", "vite", "build", "--outDir", sourceSpaDistPath(), "--emptyOutDir"],
    cwd: sourceSpaRootPath(),
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      [
        "Failed to build SPA assets.",
        `cwd: ${sourceSpaRootPath()}`,
        `outDir: ${resolve(sourceSpaDistPath())}`,
        textOutput({ value: result.stdout }),
        textOutput({ value: result.stderr }),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

if (import.meta.main) {
  await buildSpaAssets();
}

function textOutput({ value }: { value: Uint8Array }): string {
  return new TextDecoder().decode(value).trim();
}
