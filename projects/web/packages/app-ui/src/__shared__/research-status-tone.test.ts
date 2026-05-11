import { describe, expect, it } from "vitest";
import { RESEARCH_STATUSES } from "@situ/protocol";
import { researchStatusTone } from "./research-status-tone";

describe("researchStatusTone", () => {
  const expected = {
    triage: "neutral",
    accepted: "neutral",
    active: "warning",
    in_review: "warning",
    done: "success",
    canceled: "neutral",
    failed: "danger",
  } as const;

  for (const status of RESEARCH_STATUSES) {
    it(`maps "${status}" to "${expected[status]}"`, () => {
      expect(researchStatusTone({ status })).toBe(expected[status]);
    });
  }

  it("covers every research status with no fallthrough", () => {
    for (const status of RESEARCH_STATUSES) {
      expect(() => researchStatusTone({ status })).not.toThrow();
    }
  });
});
