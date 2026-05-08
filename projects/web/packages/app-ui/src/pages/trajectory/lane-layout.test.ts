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
    const layout = computeLaneLayout({
      experiments: [
        experiment({ id: "EX1", parentId: null, t: 1 }),
        experiment({ id: "EX2", parentId: null, t: 2 }),
        experiment({ id: "EX3", parentId: "EX1", t: 3 }),
      ],
    });

    const byId = new Map(layout.positions.map((p) => [p.experimentId, p]));
    expect(byId.get("EX1")?.lane).toBe(0);
    expect(byId.get("EX2")?.lane).toBe(1);
    expect(byId.get("EX3")?.lane).toBe(0);
  });

  test("emits one edge per parent-child link", () => {
    const layout = computeLaneLayout({
      experiments: [
        experiment({ id: "EX1", parentId: null, t: 1 }),
        experiment({ id: "EX2", parentId: "EX1", t: 2 }),
        experiment({ id: "EX3", parentId: "EX1", t: 3 }),
      ],
    });

    const ids = layout.edges.map((edge) => `${edge.fromId}->${edge.toId}`).sort();
    expect(ids).toEqual(["EX1->EX2", "EX1->EX3"]);
  });

  test("orphans whose parent is missing are still placed", () => {
    const layout = computeLaneLayout({
      experiments: [experiment({ id: "EX2", parentId: "EX_MISSING", t: 1 })],
    });

    expect(layout.positions).toHaveLength(1);
    expect(layout.edges).toEqual([]);
  });

  test("late grandchild sibling forks instead of stealing freed leaf lane", () => {
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
    expect(byId.get("EX3")?.lane).toBe(1);
    expect(byId.get("EX4")?.lane).toBe(0);
    expect(byId.get("EX5")?.lane).toBe(0);
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
