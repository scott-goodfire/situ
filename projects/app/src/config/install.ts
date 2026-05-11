import { installInfo } from "./install-info";

export function releaseRepo(): string {
  const value = process.env.SITU_RELEASE_REPO?.trim();
  return value ? value : installInfo().releaseRepo;
}

export function installHomeOverride(): string | null {
  const value = process.env.SITU_INSTALL_HOME?.trim();
  return value ? value : null;
}

export function binDirOverride(): string | null {
  const value = process.env.SITU_BIN_DIR?.trim();
  return value ? value : null;
}

export function releaseTarballOverride(): string | null {
  const value = process.env.SITU_RELEASE_TARBALL?.trim();
  return value ? value : null;
}

export function versionTarget(): string {
  const value = process.env.SITU_VERSION?.trim();
  return value ? value : "latest";
}
