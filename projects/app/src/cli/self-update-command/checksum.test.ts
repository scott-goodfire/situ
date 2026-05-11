import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import { sha256Of, verifyChecksum } from "./checksum";

let tempRoot: string | undefined;

describe("self-update checksum", () => {
  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  test("verifies a matching checksum entry", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-self-update-checksum-"));
    const tarballPath = join(tempRoot, "situ-v1.2.3-darwin-arm64.tar.gz");
    const checksumsPath = join(tempRoot, "checksums.txt");
    await writeFile(tarballPath, "release tarball");
    await writeFile(
      checksumsPath,
      `${await sha256Of({ path: tarballPath })}  situ-v1.2.3-darwin-arm64.tar.gz\n`,
    );

    await expect(
      verifyChecksum({
        tarballPath,
        checksumsPath,
        tarballName: "situ-v1.2.3-darwin-arm64.tar.gz",
      }),
    ).resolves.toBeUndefined();
  });

  test("rejects missing checksum entries", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-self-update-checksum-"));
    const tarballPath = join(tempRoot, "situ-v1.2.3-darwin-arm64.tar.gz");
    const checksumsPath = join(tempRoot, "checksums.txt");
    await writeFile(tarballPath, "release tarball");
    await writeFile(checksumsPath, "abc123  other.tar.gz\n");

    await expect(
      verifyChecksum({
        tarballPath,
        checksumsPath,
        tarballName: "situ-v1.2.3-darwin-arm64.tar.gz",
      }),
    ).rejects.toThrow("checksum for situ-v1.2.3-darwin-arm64.tar.gz missing");
  });

  test("rejects checksum mismatches", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-self-update-checksum-"));
    const tarballPath = join(tempRoot, "situ-v1.2.3-darwin-arm64.tar.gz");
    const checksumsPath = join(tempRoot, "checksums.txt");
    await writeFile(tarballPath, "release tarball");
    await writeFile(
      checksumsPath,
      "0000000000000000000000000000000000000000000000000000000000000000  situ-v1.2.3-darwin-arm64.tar.gz\n",
    );

    await expect(
      verifyChecksum({
        tarballPath,
        checksumsPath,
        tarballName: "situ-v1.2.3-darwin-arm64.tar.gz",
      }),
    ).rejects.toThrow("checksum mismatch for situ-v1.2.3-darwin-arm64.tar.gz");
  });
});
