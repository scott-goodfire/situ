import { describe, expect, test } from "bun:test";

import { blockersForPlannedResearchTasks } from "./blockers-for-planned-research-tasks";

describe("blockersForPlannedResearchTasks", () => {
  test("classifies missing, busy, and idle compute pools", () => {
    const blockers = blockersForPlannedResearchTasks({
      researchTasks: [
        task({ id: "task_missing", pool: "gpu" }),
        task({ id: "task_busy", pool: "h100" }),
        task({ id: "task_idle", pool: "cpu" }),
        task({ id: "task_no_compute" }),
        task({ id: "task_verify_no_compute", type: "verify" }),
      ],
      computeTargets: [
        { id: "target_dead_gpu", pool: "gpu", status: "dead" },
        { id: "target_claimed_h100", pool: "h100", status: "claimed" },
        { id: "target_idle_cpu", pool: "cpu", status: "idle" },
        { id: "target_idle_local", pool: "local", status: "idle" },
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

  test("defaults Scientist-routed tasks without compute payload to local", () => {
    const blockers = blockersForPlannedResearchTasks({
      researchTasks: [task({ id: "task_default_local" })],
      computeTargets: [],
    });

    expect(blockers).toMatchObject([
      {
        kind: "missing_pool",
        researchTaskId: "task_default_local",
        pool: "local",
      },
    ]);
  });
});

function task({ id, pool, type = "explore" }: { id: string; pool?: string; type?: string }): {
  id: string;
  type: string;
  title: string;
  payloadJson: string;
} {
  return {
    id,
    type,
    title: id,
    payloadJson: JSON.stringify(pool ? { compute: { pool } } : {}),
  };
}
