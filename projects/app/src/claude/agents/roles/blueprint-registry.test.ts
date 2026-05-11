import { describe, expect, test } from "bun:test";

import { modelForEffort } from "./models";
import { claudeAgentBlueprintForRole } from "./registry";

describe("claudeAgentBlueprintForRole", () => {
  test("returns the model override when provided", () => {
    const overridden = claudeAgentBlueprintForRole({
      role: "reporter",
      modelOverride: "claude-test-override-1",
    });
    expect(overridden.model).toBe("claude-test-override-1");
  });

  test("does not mutate the underlying registered blueprint when overriding", () => {
    const base = claudeAgentBlueprintForRole({ role: "reporter" });
    const baseModel = base.model;
    claudeAgentBlueprintForRole({ role: "reporter", modelOverride: "claude-test-override-2" });
    expect(claudeAgentBlueprintForRole({ role: "reporter" }).model).toBe(baseModel);
  });

  test("scribe is always Sonnet regardless of SITU_EFFORT", () => {
    const sonnet = modelForEffort({ effort: "medium" });
    expect(claudeAgentBlueprintForRole({ role: "scribe" }).model).toBe(sonnet);
  });

  test("reporter defaults to Opus", () => {
    const opus = modelForEffort({ effort: "high" });
    expect(claudeAgentBlueprintForRole({ role: "reporter" }).model).toBe(opus);
  });

  test("throws for unregistered role / executionMode combinations", () => {
    expect(() =>
      claudeAgentBlueprintForRole({ role: "reporter", executionMode: "headless" }),
    ).toThrow(/not registered/);
  });
});
