import { describe, expect, test } from "bun:test";

import { experimentRecord } from "./science-records";
import type { ExperimentRow } from "./types";

describe("science Replicache records", () => {
  test("experiment records expose their primary hypothesis", () => {
    const row = {
      id: "experiment-1",
      createdByResearchTaskId: "research-task-1",
      createdByAgentId: "agent-1",
      associatedHypothesisId: "hypothesis-1",
      parentExperimentId: null,
      title: "Primary hypothesis experiment",
      summary: "Tests one primary hypothesis.",
      status: "active",
      worktreePath: null,
      baseCommit: null,
      candidateCommit: null,
      syncVersion: 1,
      syncDeleted: false,
      createdAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    } satisfies ExperimentRow;

    expect(experimentRecord({ row })).toEqual(
      expect.objectContaining({
        id: "experiment-1",
        associatedHypothesisId: "hypothesis-1",
      }),
    );
  });
});
