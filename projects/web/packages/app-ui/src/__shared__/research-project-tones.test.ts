import type { DxBadgeTone } from "@situ/web-ui";
import { describe, expect, it } from "vitest";
import type {
  ResearchProjectStatus,
  ResearchTaskStatus,
  ResearchTaskVerificationStatus,
} from "../domain/records";
import {
  researchProjectStatusTone,
  researchTaskStatusTone,
  researchTaskVerificationStatusTone,
} from "./research-project-tones";

describe("researchProjectStatusTone", () => {
  const expected = {
    draft: "neutral",
    onboarding: "warning",
    researching: "warning",
    verifying: "warning",
    reporting: "warning",
    complete: "success",
    blocked: "warning",
    failed: "danger",
    canceled: "neutral",
  } satisfies Record<ResearchProjectStatus, DxBadgeTone>;

  for (const [status, tone] of Object.entries(expected)) {
    it(`maps "${status}" to "${tone}"`, () => {
      expect(researchProjectStatusTone({ status: status as ResearchProjectStatus })).toBe(tone);
    });
  }
});

describe("researchTaskStatusTone", () => {
  const expected = {
    planned: "neutral",
    running: "warning",
    worker_complete: "warning",
    verifying: "warning",
    verified: "success",
    rejected: "danger",
    needs_more_evidence: "warning",
    pruned: "neutral",
    failed: "danger",
  } satisfies Record<ResearchTaskStatus, DxBadgeTone>;

  for (const [status, tone] of Object.entries(expected)) {
    it(`maps "${status}" to "${tone}"`, () => {
      expect(researchTaskStatusTone({ status: status as ResearchTaskStatus })).toBe(tone);
    });
  }
});

describe("researchTaskVerificationStatusTone", () => {
  const expected = {
    pending: "warning",
    pass: "success",
    fail: "danger",
    suspicious: "warning",
    needs_more_evidence: "warning",
  } satisfies Record<ResearchTaskVerificationStatus, DxBadgeTone>;

  for (const [status, tone] of Object.entries(expected)) {
    it(`maps "${status}" to "${tone}"`, () => {
      expect(
        researchTaskVerificationStatusTone({
          status: status as ResearchTaskVerificationStatus,
        }),
      ).toBe(tone);
    });
  }
});
