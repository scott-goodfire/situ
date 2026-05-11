import { cp, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { sha256Of } from "./checksum";
import { fetchRelease, githubFetch, resolveLatestReleaseTag } from "./github";
import { normalizeTag } from "./platform";
import type { GitHubRelease, PreparedRelease, SelfUpdateOptions } from "./types";

export async function prepareRelease({
  options,
  platform,
  tmpRoot,
}: {
  options: SelfUpdateOptions;
  platform: string;
  tmpRoot: string;
}): Promise<PreparedRelease> {
  const tag =
    options.version === "latest"
      ? await resolveLatestReleaseTag({ repo: options.repo })
      : normalizeTag({ version: options.version });
  const tarballName = `situ-${tag}-${platform}.tar.gz`;
  const tarballPath = join(tmpRoot, tarballName);
  const checksumsPath = join(tmpRoot, "checksums.txt");

  if (options.tarball) {
    await cp(options.tarball, tarballPath);
    await writeFile(checksumsPath, `${await sha256Of({ path: tarballPath })}  ${tarballName}\n`);
    return { tag, tarballName, tarballPath, checksumsPath };
  }

  const release = await fetchRelease({ repo: options.repo, tag });
  await downloadReleaseAsset({
    release,
    name: tarballName,
    outPath: tarballPath,
  });
  await downloadReleaseAsset({
    release,
    name: "checksums.txt",
    outPath: checksumsPath,
  });
  return { tag, tarballName, tarballPath, checksumsPath };
}

async function downloadReleaseAsset({
  release,
  name,
  outPath,
}: {
  release: GitHubRelease;
  name: string;
  outPath: string;
}): Promise<void> {
  const asset = release.assets.find((candidate) => candidate.name === name);
  if (!asset) {
    throw new Error(`release ${release.tag_name} does not contain ${name}`);
  }
  const response = await githubFetch({
    url: asset.url,
    accept: "application/octet-stream",
  });
  await writeFile(outPath, Buffer.from(await response.arrayBuffer()));
}
