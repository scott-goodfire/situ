import { describe, expect, it } from "vitest";

import type { ResearchProjectRecord } from "@situ/protocol";
import { isProjectKickedOff } from "./is-project-kicked-off";

describe("isProjectKickedOff", () => {
  it("is false during onboarding and baseline", () => {
    expect(isProjectKickedOff({ project: project({ phase: "onboarding" }) })).toBe(false);
    expect(isProjectKickedOff({ project: project({ phase: "baseline" }) })).toBe(false);
  });

  it("is true once the project enters search", () => {
    expect(isProjectKickedOff({ project: project({ phase: "search" }) })).toBe(true);
  });

  it("is true during reporting", () => {
    expect(isProjectKickedOff({ project: project({ phase: "reporting" }) })).toBe(true);
  });

  it("counts complete as kicked-off so finished sessions still show feed/dashboard", () => {
    expect(isProjectKickedOff({ project: project({ phase: "complete" }) })).toBe(true);
  });
});

function project({ phase }: { phase: ResearchProjectRecord["phase"] }): ResearchProjectRecord {
  return {
    id: "rp_test",
    goal: "test goal",
    phase,
    status: "active",
    baselineSummary: null,
    resultSummary: null,
    createdByAgentId: null,
    startedAt: null,
    completedAt: null,
    payload: {},
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
  };
}
