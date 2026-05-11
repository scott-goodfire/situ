import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spaDistOverride } from "../config/paths";

export type SpaAssetsMode = "configured" | "installed" | "source";

export type SpaAssets = {
  mode: SpaAssetsMode;
  root: string;
};

export function sourceSpaRootPath(): string {
  return resolve(moduleDir(), "../../../web");
}

export function sourceSpaDistPath(): string {
  return resolve(moduleDir(), "../../dist/spa");
}

export function resolveSpaAssets(): SpaAssets {
  const configured = spaDistOverride();
  if (configured) {
    return {
      mode: "configured",
      root: resolve(configured),
    };
  }

  const installed = installedSpaDistPath();
  if (hasSpaAssets({ root: installed })) {
    return {
      mode: "installed",
      root: installed,
    };
  }

  return {
    mode: "source",
    root: sourceSpaDistPath(),
  };
}

export function shouldBuildSourceSpaAssets(): boolean {
  if (spaDistOverride()) {
    return false;
  }
  return !hasSpaAssets({ root: installedSpaDistPath() });
}

export function hasSpaAssets({ root }: { root: string }): boolean {
  return missingSpaAssets({ root }).length === 0;
}

export function missingSpaAssets({ root }: { root: string }): string[] {
  const missing: string[] = [];
  if (!existsSync(resolve(root, "index.html"))) {
    missing.push("index.html");
  }
  const assetsDir = resolve(root, "assets");
  if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) {
    missing.push("assets/");
  }
  return missing;
}

export function missingSourceSpaAppFiles({
  root = sourceSpaRootPath(),
}: { root?: string } = {}): string[] {
  const missing: string[] = [];
  for (const relativePath of ["index.html", "package.json", "src/main.tsx", "vite.config.ts"]) {
    const absolutePath = resolve(root, relativePath);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      missing.push(relativePath);
    }
  }
  return missing;
}

function installedSpaDistPath(): string {
  return resolve(dirname(realExecutablePath()), "..", "share", "spa");
}

function moduleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function realExecutablePath(): string {
  try {
    return realpathSync(process.execPath);
  } catch {
    return process.execPath;
  }
}
