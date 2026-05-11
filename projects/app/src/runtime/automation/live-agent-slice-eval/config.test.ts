import { describe, expect, test } from "bun:test";

import { parseLiveAgentSliceEvalConfig, readLiveAgentSliceEvalConfig } from "./config";

describe("live agent slice eval config", () => {
  test("parses required fields and defaults optional fields", () => {
    const config = parseLiveAgentSliceEvalConfig({
      value: {
        driver: "manager_turn",
        goal: "  Find the baseline  ",
        timeoutSeconds: "30",
      },
    });

    expect(config.driver).toBe("manager_turn");
    expect(config.goal).toBe("Find the baseline");
    expect(config.timeoutSeconds).toBe(30);
    expect(config.projectPhase).toBe("search");
    expect(config.type).toBe("explore");
    expect(config.priority).toBe("high");
    expect(config.seedResearchTasks).toEqual([]);
  });

  test("parses seeded research tasks and default verification profile", () => {
    const config = parseLiveAgentSliceEvalConfig({
      value: {
        driver: "verifier_turn",
        goal: "Verify seeded evidence.",
        timeoutSeconds: 20,
        seedResearchTasks: [
          {
            title: "Seed task",
            type: "verify",
            workerPrompt: "Summarize evidence.",
            verificationPrompt: "Check evidence.",
            status: "awaiting_verification",
            resultSummary: "Evidence is ready.",
            verification: {
              status: "passed",
              judgment: "Looks correct.",
              evidenceSummary: "The evidence supports the result.",
            },
          },
        ],
      },
    });

    expect(config.seedResearchTasks).toEqual([
      {
        title: "Seed task",
        type: "verify",
        priority: "normal",
        workerPrompt: "Summarize evidence.",
        verificationPrompt: "Check evidence.",
        status: "awaiting_verification",
        resultSummary: "Evidence is ready.",
        verification: {
          status: "passed",
          profile: "general",
          judgment: "Looks correct.",
          evidenceSummary: "The evidence supports the result.",
        },
      },
    ]);
  });

  test("rejects missing argv config", () => {
    expect(() => readLiveAgentSliceEvalConfig({ argv: ["bun", "script.ts"] })).toThrow(
      "Live agent slice eval config JSON is required.",
    );
  });

  test("rejects invalid timeout", () => {
    expect(() =>
      parseLiveAgentSliceEvalConfig({
        value: {
          driver: "manager_turn",
          goal: "Find the baseline.",
          timeoutSeconds: 0,
        },
      }),
    ).toThrow("timeoutSeconds must be a positive number.");
  });
});
