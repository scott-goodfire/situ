import { describe, expect, test } from "bun:test";
import type { ExperimentRecord } from "@situ/protocol";
import { computeLaneLayout } from "./lane-layout";

describe("computeLaneLayout", () => {
  test("places a single root in lane 0 row 0", () => {
    const layout = computeLaneLayout({
      experiments: [experiment({ id: "EX1", parentId: null, t: 1 })],
    });
    expect(layout.positions).toEqual([
      { experimentId: "EX1", row: 0, lane: 0 },
    ]);
    expect(layout.edges).toEqual([]);
    expect(layout.laneCount).toBe(1);
  });

  test("first child reuses parent lane; subsequent siblings fork", () => {
    const layout = computeLaneLayout({
      experiments: [
        experiment({ id: "EX1", parentId: null, t: 1 }),
        experiment({ id: "EX2", parentId: "EX1", t: 2 }),
        experiment({ id: "EX3", parentId: "EX1", t: 3 }),
      ],
    });
    const byId = new Map(layout.positions.map((p) => [p.experimentId, p]));
    expect(byId.get("EX1")).toEqual({ experimentId: "EX1", row: 0, lane: 0 });
    expect(byId.get("EX2")).toEqual({ experimentId: "EX2", row: 1, lane: 0 });
    expect(byId.get("EX3")).toEqual({ experimentId: "EX3", row: 2, lane: 1 });
    expect(layout.laneCount).toBe(2);
  });

  test("leaf lanes are reclaimed by later unrelated roots", () => {
    const layout = computeLaneLayout({
      experiments: [
        // Root EX1 is a leaf; EX2 is a separate root that lands afterwards.
        experiment({ id: "EX1", parentId: null, t: 1 }),
        experiment({ id: "EX2", parentId: null, t: 2 }),
      ],
    });
    const byId = new Map(layout.positions.map((p) => [p.experimentId, p]));
    expect(byId.get("EX1")).toEqual({ experimentId: "EX1", row: 0, lane: 0 });
    expect(byId.get("EX2")).toEqual({ experimentId: "EX2", row: 1, lane: 0 });
    expect(layout.laneCount).toBe(1);
  });

  test("non-leaf parent keeps lane reserved until first child claims it", () => {
    // EX1 has a child EX3, but an unrelated root EX2 appears first by time.
    const layout = computeLaneLayout({
      experiments: [
        experiment({ id: "EX1", parentId: null, t: 1 }),
        experiment({ id: "EX2", parentId: null, t: 2 }),
        experiment({ id: "EX3", parentId: "EX1", t: 3 }),
      ],
    });
    const byId = new Map(layout.positions.map((p) => [p.experimentId, p]));
    expect(byId.get("EX1")?.lane).toBe(0);
    // EX2 must not steal EX1's lane while EX1 is still expecting children.
    expect(byId.get("EX2")?.lane).toBe(1);
    expect(byId.get("EX3")?.lane).toBe(0);
  });

  test("emits one edge per parent->child link", () => {
    const layout = computeLaneLayout({
      experiments: [
        experiment({ id: "EX1", parentId: null, t: 1 }),
        experiment({ id: "EX2", parentId: "EX1", t: 2 }),
        experiment({ id: "EX3", parentId: "EX1", t: 3 }),
      ],
    });
    const ids = layout.edges
      .map((edge) => `${edge.fromId}->${edge.toId}`)
      .sort();
    expect(ids).toEqual(["EX1->EX2", "EX1->EX3"]);
  });

  test("orphans whose parent is missing are still placed", () => {
    const layout = computeLaneLayout({
      experiments: [
        experiment({ id: "EX2", parentId: "EX_MISSING", t: 1 }),
      ],
    });
    expect(layout.positions).toHaveLength(1);
    expect(layout.edges).toEqual([]);
  });

  test("late grandchild sibling forks instead of stealing freed leaf lane", () => {
    // EX2 has two children: EX4 (early) and EX6 (late). EX4 has its own child
    // EX5 which is a leaf. When EX5 is placed and would naively free lane 0,
    // EX6 — still pending under EX2 — must NOT inherit lane 0 since the
    // EX2->EX6 edge will run through that column.
    const layout = computeLaneLayout({
      experiments: [
        experiment({ id: "EX1", parentId: null, t: 1 }),
        experiment({ id: "EX2", parentId: "EX1", t: 2 }),
        experiment({ id: "EX3", parentId: "EX1", t: 3 }),
        experiment({ id: "EX4", parentId: "EX2", t: 4 }),
        experiment({ id: "EX5", parentId: "EX4", t: 5 }),
        experiment({ id: "EX6", parentId: "EX2", t: 6 }),
      ],
    });
    const byId = new Map(layout.positions.map((p) => [p.experimentId, p]));
    expect(byId.get("EX1")?.lane).toBe(0);
    expect(byId.get("EX2")?.lane).toBe(0);
    // EX3 is the second child of EX1; takes lane 1.
    expect(byId.get("EX3")?.lane).toBe(1);
    // EX4 is the first child of EX2; takes parent's lane.
    expect(byId.get("EX4")?.lane).toBe(0);
    // EX5 is the only child of EX4; takes parent's lane.
    expect(byId.get("EX5")?.lane).toBe(0);
    // Critical: EX6 must NOT take lane 0 — that column is reserved for
    // the EX2->EX6 edge to pass through cleanly.
    expect(byId.get("EX6")?.lane).not.toBe(0);
  });
});

function experiment({
  id,
  parentId,
  t,
}: {
  id: string;
  parentId: string | null;
  t: number;
}): ExperimentRecord {
  const created = new Date(2026, 0, 1, 0, 0, t).toISOString();
  return {
    id,
    project_id: "P1",
    status: "active",
    title: id,
    summary: "",
    parent_experiment_id: parentId,
    created_at: created,
    updated_at: created,
  };
}
