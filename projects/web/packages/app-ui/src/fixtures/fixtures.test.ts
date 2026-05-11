import { describe, expect, it } from "vitest";
import { RESEARCH_STATUSES } from "@situ/protocol";
import {
  BASELINE_FIXTURES,
  EVALUATION_FIXTURES,
  EXPERIMENT_FIXTURES,
  HYPOTHESIS_FIXTURES,
  RESEARCH_PROJECT_FIXTURES,
  RESEARCH_PROJECT_INTERACTION_FIXTURES,
  RESEARCH_TASK_FIXTURES,
  RESEARCH_TASK_VERIFICATION_FIXTURES,
} from "./index";

describe("research fixtures", () => {
  const sets = [
    ["hypothesis", HYPOTHESIS_FIXTURES],
    ["experiment", EXPERIMENT_FIXTURES],
    ["baseline", BASELINE_FIXTURES],
    ["evaluation", EVALUATION_FIXTURES],
  ] as const;

  for (const [name, rows] of sets) {
    it(`every ${name} fixture uses a valid status`, () => {
      for (const row of rows) {
        expect(RESEARCH_STATUSES).toContain(row.status);
      }
    });

    it(`every ${name} fixture has a stable id`, () => {
      const ids = rows.map((row) => row.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }
});

describe("verified research fixtures", () => {
  it("every research project fixture has a valid status", () => {
    const statuses = [
      "draft",
      "onboarding",
      "researching",
      "verifying",
      "reporting",
      "complete",
      "blocked",
      "failed",
      "canceled",
    ];

    for (const row of RESEARCH_PROJECT_FIXTURES) {
      expect(statuses).toContain(row.status);
    }
  });

  it("every research task fixture references a project", () => {
    const projectIds = new Set(RESEARCH_PROJECT_FIXTURES.map((row) => row.id));
    const statuses = [
      "planned",
      "running",
      "worker_complete",
      "verifying",
      "verified",
      "rejected",
      "needs_more_evidence",
      "pruned",
      "failed",
    ];

    for (const row of RESEARCH_TASK_FIXTURES) {
      expect(projectIds.has(row.projectId)).toBe(true);
      expect(statuses).toContain(row.status);
    }
  });

  it("every research task verification fixture references a ResearchTask", () => {
    const researchTaskIds = new Set(RESEARCH_TASK_FIXTURES.map((row) => row.id));
    const statuses = ["pending", "pass", "fail", "suspicious", "needs_more_evidence"];

    for (const row of RESEARCH_TASK_VERIFICATION_FIXTURES) {
      expect(researchTaskIds.has(row.researchTaskId)).toBe(true);
      expect(statuses).toContain(row.status);
    }
  });

  it("every research project interaction fixture references a project", () => {
    const projectIds = new Set(RESEARCH_PROJECT_FIXTURES.map((row) => row.id));

    for (const row of RESEARCH_PROJECT_INTERACTION_FIXTURES) {
      expect(projectIds.has(row.projectId)).toBe(true);
    }
  });
});
