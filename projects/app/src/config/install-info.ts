export type InstallInfo = {
  version: string;
  gitSha: string | null;
  buildDate: string | null;
  releaseRepo: string;
};

export function installInfo(): InstallInfo {
  return {
    version: buildEnvValue(process.env.SITU_BUILD_VERSION) ?? "0.1.0-dev",
    gitSha: buildEnvValue(process.env.SITU_BUILD_GIT_SHA),
    buildDate: buildEnvValue(process.env.SITU_BUILD_DATE),
    releaseRepo: buildEnvValue(process.env.SITU_BUILD_RELEASE_REPO) ?? "scott-goodfire/situ",
  };
}

function buildEnvValue(value: string | undefined): string | null {
  value = value?.trim();
  return value ? value : null;
}
