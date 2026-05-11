import {
  binDirOverride,
  installHomeOverride,
  releaseRepo,
  releaseTarballOverride,
  versionTarget,
} from "../../config/install";
import { commandLineModule } from "../../modules/command-line";
import { defaultBinDir, defaultInstallHome, inferInstallHome } from "./install-paths";
import type { SelfUpdateOptions } from "./types";

export async function parseSelfUpdateOptions({
  argv,
}: {
  argv: string[];
}): Promise<SelfUpdateOptions> {
  const parsed = parseSelfUpdateArgv({ argv });
  const version = selfUpdateVersion({ parsed });
  const tarball = selfUpdateTarball({ parsed });
  if (tarball && version === "latest") {
    throw new Error("SITU_RELEASE_TARBALL or --tarball requires an explicit version");
  }
  return {
    version,
    repo: selfUpdateRepo({ parsed }),
    installHome: await selfUpdateInstallHome({ parsed }),
    binDir: selfUpdateBinDir({ parsed }),
    tarball,
    json: commandLineModule.booleanOption({ value: parsed.options.json }),
  };
}

function parseSelfUpdateArgv({
  argv,
}: {
  argv: string[];
}): ReturnType<typeof commandLineModule.parseOptions> {
  const parsed = commandLineModule.parseOptions({
    argv,
    commandName: "situ self-update",
    options: [
      { rawName: "--repo <repo>" },
      { rawName: "--install-home <path>" },
      { rawName: "--bin-dir <path>" },
      { rawName: "--tarball <path>" },
      { rawName: "--json" },
    ],
  });
  if (parsed.positionals.length > 1) {
    throw new Error("self-update accepts at most one version argument");
  }
  return parsed;
}

function selfUpdateVersion({
  parsed,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
}): string {
  return parsed.positionals[0] ?? versionTarget();
}

function selfUpdateRepo({
  parsed,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
}): string {
  return (
    commandLineModule.optionalStringOption({ value: parsed.options.repo, flag: "--repo" }) ??
    releaseRepo()
  );
}

async function selfUpdateInstallHome({
  parsed,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
}): Promise<string> {
  const option = commandLineModule.optionalStringOption({
    value: parsed.options.installHome,
    flag: "--install-home",
  });
  if (option) {
    return option;
  }
  const override = installHomeOverride();
  if (override) {
    return override;
  }
  return (await inferInstallHome()) ?? defaultInstallHome();
}

function selfUpdateBinDir({
  parsed,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
}): string {
  return (
    commandLineModule.optionalStringOption({ value: parsed.options.binDir, flag: "--bin-dir" }) ??
    binDirOverride() ??
    defaultBinDir()
  );
}

function selfUpdateTarball({
  parsed,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
}): string | undefined {
  return (
    commandLineModule.optionalStringOption({ value: parsed.options.tarball, flag: "--tarball" }) ??
    releaseTarballOverride() ??
    undefined
  );
}
