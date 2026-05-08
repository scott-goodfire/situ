import type { ExperimentRecord } from "@situ/protocol";

export type TrajectoryPosition = {
  experimentId: string;
  row: number;
  lane: number;
};

export type TrajectoryEdge = {
  fromId: string;
  toId: string;
  fromRow: number;
  fromLane: number;
  toRow: number;
  toLane: number;
};

export type TrajectoryGraphLayout = {
  positions: TrajectoryPosition[];
  edges: TrajectoryEdge[];
  laneCount: number;
};

export function computeLaneLayout({
  experiments,
}: {
  experiments: ExperimentRecord[];
}): TrajectoryGraphLayout {
  const ordered = topologicallyOrdered({ experiments });
  const byId = new Map(ordered.map((e) => [e.id, e]));
  const childCount = countChildren({ experiments: ordered });
  const remainingChildren = new Map(childCount);
  const lanes: Array<string | null> = [];
  const positionById = new Map<string, TrajectoryPosition>();
  let pendingFreeLanes: number[] = [];

  const sweepPendingFree = () => {
    pendingFreeLanes = pendingFreeLanes.filter((lane) => {
      const ownerId = lanes[lane];
      if (!ownerId) return false;
      const owner = byId.get(ownerId);
      if (!owner) {
        lanes[lane] = null;
        return false;
      }
      if (allAncestorsDone({ experiment: owner, remainingChildren, byId })) {
        lanes[lane] = null;
        return false;
      }
      return true;
    });
  };

  ordered.forEach((experiment, row) => {
    const lane = pickLane({ experiment, lanes, positionById });
    lanes[lane] = experiment.id;
    positionById.set(experiment.id, { experimentId: experiment.id, row, lane });

    const parentId = experiment.parent_experiment_id ?? null;
    if (parentId && remainingChildren.has(parentId)) {
      remainingChildren.set(parentId, (remainingChildren.get(parentId) ?? 0) - 1);
    }

    sweepPendingFree();

    const isLeaf = !childCount.has(experiment.id);
    if (isLeaf) {
      if (allAncestorsDone({ experiment, remainingChildren, byId })) {
        lanes[lane] = null;
      } else {
        pendingFreeLanes.push(lane);
      }
    }
  });

  const edges = buildEdges({ ordered, positionById });
  const laneCount =
    ordered.length === 0
      ? 0
      : Math.max(...ordered.map((e) => positionById.get(e.id)!.lane)) + 1;

  return {
    positions: ordered.map((e) => positionById.get(e.id)!),
    edges,
    laneCount,
  };
}

function allAncestorsDone({
  experiment,
  remainingChildren,
  byId,
}: {
  experiment: ExperimentRecord;
  remainingChildren: Map<string, number>;
  byId: Map<string, ExperimentRecord>;
}): boolean {
  let parentId: string | null | undefined = experiment.parent_experiment_id;
  while (parentId) {
    if ((remainingChildren.get(parentId) ?? 0) > 0) return false;
    parentId = byId.get(parentId)?.parent_experiment_id ?? null;
  }
  return true;
}

function pickLane({
  experiment,
  lanes,
  positionById,
}: {
  experiment: ExperimentRecord;
  lanes: Array<string | null>;
  positionById: Map<string, TrajectoryPosition>;
}): number {
  const parentId = experiment.parent_experiment_id ?? null;
  if (parentId) {
    const parentPos = positionById.get(parentId);
    if (parentPos && lanes[parentPos.lane] === parentId) return parentPos.lane;
  }
  return firstFreeLane({ lanes });
}

function firstFreeLane({ lanes }: { lanes: Array<string | null> }): number {
  for (let i = 0; i < lanes.length; i += 1) {
    if (lanes[i] === null) return i;
  }
  return lanes.length;
}

function countChildren({ experiments }: { experiments: ExperimentRecord[] }): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of experiments) {
    const parentId = e.parent_experiment_id;
    if (!parentId) continue;
    counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
  }
  return counts;
}

function buildEdges({
  ordered,
  positionById,
}: {
  ordered: ExperimentRecord[];
  positionById: Map<string, TrajectoryPosition>;
}): TrajectoryEdge[] {
  const edges: TrajectoryEdge[] = [];
  for (const experiment of ordered) {
    const parentId = experiment.parent_experiment_id;
    if (!parentId) continue;
    const childPos = positionById.get(experiment.id);
    const parentPos = positionById.get(parentId);
    if (!childPos || !parentPos) continue;
    edges.push({
      fromId: parentId,
      toId: experiment.id,
      fromRow: parentPos.row,
      fromLane: parentPos.lane,
      toRow: childPos.row,
      toLane: childPos.lane,
    });
  }
  return edges;
}

function topologicallyOrdered({ experiments }: { experiments: ExperimentRecord[] }): ExperimentRecord[] {
  const byId = new Map(experiments.map((e) => [e.id, e]));
  const childrenByParent = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const e of experiments) inDegree.set(e.id, 0);
  for (const e of experiments) {
    const parentId = e.parent_experiment_id ?? null;
    if (parentId && byId.has(parentId)) {
      const list = childrenByParent.get(parentId) ?? [];
      list.push(e.id);
      childrenByParent.set(parentId, list);
      inDegree.set(e.id, (inDegree.get(e.id) ?? 0) + 1);
    }
  }

  const result: ExperimentRecord[] = [];
  const frontier = new Set<string>();
  for (const [id, deg] of inDegree) {
    if (deg === 0) frontier.add(id);
  }

  while (frontier.size > 0) {
    const pickId = earliestInFrontier({ frontier, byId });
    if (pickId === null) break;
    frontier.delete(pickId);
    result.push(byId.get(pickId)!);

    for (const childId of childrenByParent.get(pickId) ?? []) {
      const next = (inDegree.get(childId) ?? 1) - 1;
      inDegree.set(childId, next);
      if (next === 0) frontier.add(childId);
    }
  }

  if (result.length < experiments.length) {
    const seen = new Set(result.map((r) => r.id));
    for (const e of experiments) {
      if (!seen.has(e.id)) result.push(e);
    }
  }

  return result;
}

function earliestInFrontier({
  frontier,
  byId,
}: {
  frontier: Set<string>;
  byId: Map<string, ExperimentRecord>;
}): string | null {
  let pickId: string | null = null;
  let pickKey = "";
  for (const id of frontier) {
    const record = byId.get(id);
    if (!record) continue;
    const key = `${record.created_at}|${record.id}`;
    if (pickId === null || key < pickKey) {
      pickId = id;
      pickKey = key;
    }
  }
  return pickId;
}
