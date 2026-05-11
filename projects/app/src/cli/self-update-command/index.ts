import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { printResult } from "../__shared__";
import { installInfo } from "../../config/install-info";
import { verifyChecksum } from "./checksum";
import { installRelease } from "./install-release";
import { parseSelfUpdateOptions } from "./options";
import { detectPlatform } from "./platform";
import { prepareRelease } from "./release";
import type { SelfUpdateOptions, SelfUpdateResult } from "./types";

export async function runSelfUpdateCommand({ argv }: { argv: string[] }): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printSelfUpdateHelp();
    return 0;
  }

  const options = await parseSelfUpdateOptions({ argv });
  const result = await selfUpdate({ options });
  printResult({
    json: options.json,
    value: result,
    text: selfUpdateResultText({ result }),
  });
  return 0;
}

async function selfUpdate({ options }: { options: SelfUpdateOptions }): Promise<SelfUpdateResult> {
  const previousVersion = installInfo().version;
  const platform = detectPlatform();
  const tmpRoot = await mkdtemp(join(tmpdir(), "situ-self-update-"));
  try {
    const release = await prepareRelease({
      options,
      platform,
      tmpRoot,
    });
    await verifyChecksum({
      tarballPath: release.tarballPath,
      checksumsPath: release.checksumsPath,
      tarballName: release.tarballName,
    });

    const versionDir = await installRelease({
      tag: release.tag,
      tarballPath: release.tarballPath,
      installHome: options.installHome,
      binDir: options.binDir,
    });

    return {
      previousVersion,
      version: release.tag,
      repo: options.repo,
      platform,
      installHome: options.installHome,
      versionDir,
      launcher: join(options.binDir, "situ"),
      tarball: release.tarballName,
    };
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

function selfUpdateResultText({ result }: { result: SelfUpdateResult }): string {
  return [
    `Situ updated to ${result.version}.`,
    `  previous:      ${result.previousVersion}`,
    `  versioned dir: ${result.versionDir}`,
    `  launcher:      ${result.launcher}`,
  ].join("\n");
}

function printSelfUpdateHelp(): void {
  console.log(`Usage:
  situ self-update [version] [--repo owner/name] [--install-home path] [--bin-dir path]
  situ self update [version]

Options:
  --repo owner/name     GitHub release repo. Defaults to SITU_RELEASE_REPO or the build repo.
  --install-home path   Versioned install root. Defaults to SITU_INSTALL_HOME, the current install, or ~/.local/share/situ.
  --bin-dir path        Launcher symlink directory. Defaults to SITU_BIN_DIR or ~/.local/bin.
  --tarball path        Install a local release tarball. Requires an explicit version.
  --json                Print machine-readable update metadata.`);
}
