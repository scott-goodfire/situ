import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { applyEffortFlag } from "./effort-flag";

describe("applyEffortFlag", () => {
  const originalEffort = process.env.SITU_EFFORT;

  beforeEach(() => {
    delete process.env.SITU_EFFORT;
  });

  afterEach(() => {
    if (originalEffort === undefined) {
      delete process.env.SITU_EFFORT;
    } else {
      process.env.SITU_EFFORT = originalEffort;
    }
  });

  test("returns undefined and leaves argv alone when no flag is present", () => {
    const argv = ["exec", "--objective", "do thing"];
    const applied = applyEffortFlag({ argv });
    expect(applied).toBeUndefined();
    expect(argv).toEqual(["exec", "--objective", "do thing"]);
    expect(process.env.SITU_EFFORT).toBeUndefined();
  });

  test("extracts --effort high and removes both tokens", () => {
    const argv = ["exec", "--effort", "high", "--objective", "do thing"];
    const applied = applyEffortFlag({ argv });
    expect(applied).toBe("high");
    expect(argv).toEqual(["exec", "--objective", "do thing"]);
    expect(process.env.SITU_EFFORT).toBe("high");
  });

  test("supports -e shorthand", () => {
    const argv = ["exec", "-e", "high", "--objective", "x"];
    applyEffortFlag({ argv });
    expect(process.env.SITU_EFFORT).toBe("high");
    expect(argv).toEqual(["exec", "--objective", "x"]);
  });

  test("works when --effort is at the start", () => {
    const argv = ["--effort", "high", "exec", "--objective", "x"];
    applyEffortFlag({ argv });
    expect(process.env.SITU_EFFORT).toBe("high");
    expect(argv).toEqual(["exec", "--objective", "x"]);
  });

  test("last occurrence wins when --effort appears multiple times", () => {
    const argv = ["--effort", "medium", "exec", "--effort", "high"];
    applyEffortFlag({ argv });
    expect(process.env.SITU_EFFORT).toBe("high");
    expect(argv).toEqual(["exec"]);
  });

  test("drops a bare --effort with no value", () => {
    const argv = ["exec", "--effort", "--objective", "x"];
    applyEffortFlag({ argv });
    expect(process.env.SITU_EFFORT).toBeUndefined();
    expect(argv).toEqual(["exec", "--objective", "x"]);
  });

  test("drops a trailing bare --effort", () => {
    const argv = ["exec", "--effort"];
    applyEffortFlag({ argv });
    expect(process.env.SITU_EFFORT).toBeUndefined();
    expect(argv).toEqual(["exec"]);
  });
});
