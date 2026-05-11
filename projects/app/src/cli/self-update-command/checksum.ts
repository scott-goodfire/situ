import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function verifyChecksum({
  tarballPath,
  checksumsPath,
  tarballName,
}: {
  tarballPath: string;
  checksumsPath: string;
  tarballName: string;
}): Promise<void> {
  const expected = (await readFile(checksumsPath, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .find(([, name]) => name === tarballName || name === `*${tarballName}`)?.[0];
  if (!expected) {
    throw new Error(`checksum for ${tarballName} missing from checksums.txt`);
  }
  const actual = await sha256Of({ path: tarballPath });
  if (expected !== actual) {
    throw new Error(`checksum mismatch for ${tarballName} (expected ${expected}, got ${actual})`);
  }
}

export async function sha256Of({ path }: { path: string }): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}
