import { describe, expect, test } from "bun:test";

import { detectPlatform, normalizeTag } from "./platform";

describe("self-update platform", () => {
  test("detects supported platform labels", () => {
    expect(detectPlatform({ platform: "darwin", arch: "arm64" })).toBe("darwin-arm64");
    expect(detectPlatform({ platform: "linux", arch: "x64" })).toBe("linux-x64");
  });

  test("rejects unsupported platform labels", () => {
    expect(() => detectPlatform({ platform: "win32", arch: "x64" })).toThrow(
      "unsupported OS: win32",
    );
    expect(() => detectPlatform({ platform: "linux", arch: "ia32" })).toThrow(
      "unsupported arch: ia32",
    );
  });

  test("normalizes release tags", () => {
    expect(normalizeTag({ version: "1.2.3" })).toBe("v1.2.3");
    expect(normalizeTag({ version: "v1.2.3" })).toBe("v1.2.3");
  });
});
