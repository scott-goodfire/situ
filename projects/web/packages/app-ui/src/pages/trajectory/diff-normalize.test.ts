import { describe, expect, test } from "bun:test";
import { normalizeBlankContextLines, splitFilePatches } from "./diff-normalize";

describe("diff-normalize", () => {
  test("normalizes blank context lines for patch rendering", () => {
    expect(normalizeBlankContextLines({ diff: " context\n\n+added" })).toBe(
      " context\n \n+added",
    );
  });

  test("splits multi-file patches without dropping content", () => {
    const diff = [
      "diff --git a/a.txt b/a.txt",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      "diff --git a/b.txt b/b.txt",
      "--- a/b.txt",
      "+++ b/b.txt",
      "@@ -1 +1 @@",
      "-left",
      "+right",
    ].join("\n");

    const patches = splitFilePatches({ diff });
    expect(patches).toHaveLength(2);
    expect(patches[0]).toContain("a/a.txt");
    expect(patches[1]).toContain("a/b.txt");
  });
});
