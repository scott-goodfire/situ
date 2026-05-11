import { describe, expect, test } from "bun:test";

import { computeBlockersForPlannedResearchTasks } from "./compute-blockers";

describe("computeBlockersForPlannedResearchTasks", () => {
  test("classifies missing, busy, and idle compute pools", () => {
    const blockers = computeBlockersForPlannedResearchTasks({
      researchTasks: [
        task({ id: "task_missing", pool: "gpu" }),
        task({ id: "task_busy", pool: "h100" }),
        task({ id: "task_idle", pool: "cpu" }),
        task({ id: "task_no_compute" }),
      ],
      computeTargets: [
        { id: "target_dead_gpu", pool: "gpu", status: "dead" },
        { id: "target_claimed_h100", pool: "h100", status: "claimed" },
        { id: "target_idle_cpu", pool: "cpu", status: "idle" },
      ],
    });

    expect(blockers).toMatchObject([
      {
        kind: "missing_pool",
        researchTaskId: "task_missing",
        pool: "gpu",
        totalTargets: 0,
        idleTargets: 0,
      },
      {
        kind: "busy_pool",
        researchTaskId: "task_busy",
        pool: "h100",
        totalTargets: 1,
        idleTargets: 0,
        claimedTargets: 1,
      },
    ]);
  });
});

function task({ id, pool }: { id: string; pool?: string }): {
  id: string;
  title: string;
  payloadJson: string;
} {
  return {
    id,
    title: id,
    payloadJson: JSON.stringify(pool ? { compute: { pool } } : {}),
  };
}
