import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { parseSelfUpdateOptions } from "./options";

const originalEnv = {
  SITU_BIN_DIR: process.env.SITU_BIN_DIR,
  SITU_INSTALL_HOME: process.env.SITU_INSTALL_HOME,
  SITU_RELEASE_REPO: process.env.SITU_RELEASE_REPO,
  SITU_RELEASE_TARBALL: process.env.SITU_RELEASE_TARBALL,
  SITU_VERSION: process.env.SITU_VERSION,
};

describe("self-update options", () => {
  beforeEach(() => {
    for (const key of Object.keys(originalEnv)) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    restoreEnv();
  });

  test("parses explicit CLI options", async () => {
    await expect(
      parseSelfUpdateOptions({
        argv: [
          "v1.2.3",
          "--repo",
          "owner/repo",
          "--install-home",
          "/tmp/situ-install",
          "--bin-dir",
          "/tmp/situ-bin",
          "--json",
        ],
      }),
    ).resolves.toEqual({
      version: "v1.2.3",
      repo: "owner/repo",
      installHome: "/tmp/situ-install",
      binDir: "/tmp/situ-bin",
      tarball: undefined,
      json: true,
    });
  });

  test("uses environment defaults", async () => {
    process.env.SITU_VERSION = "v9.9.9";
    process.env.SITU_RELEASE_REPO = "env/repo";
    process.env.SITU_INSTALL_HOME = "/tmp/env-install";
    process.env.SITU_BIN_DIR = "/tmp/env-bin";
    process.env.SITU_RELEASE_TARBALL = "/tmp/release.tar.gz";

    await expect(parseSelfUpdateOptions({ argv: [] })).resolves.toEqual({
      version: "v9.9.9",
      repo: "env/repo",
      installHome: "/tmp/env-install",
      binDir: "/tmp/env-bin",
      tarball: "/tmp/release.tar.gz",
      json: false,
    });
  });

  test("requires explicit version for a local tarball", async () => {
    await expect(
      parseSelfUpdateOptions({
        argv: ["--tarball", "/tmp/release.tar.gz"],
      }),
    ).rejects.toThrow("SITU_RELEASE_TARBALL or --tarball requires an explicit version");
  });

  test("rejects more than one version positional", async () => {
    await expect(
      parseSelfUpdateOptions({
        argv: ["v1.2.3", "v1.2.4"],
      }),
    ).rejects.toThrow("self-update accepts at most one version argument");
  });
});

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
