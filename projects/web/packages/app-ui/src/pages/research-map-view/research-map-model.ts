import { DateTime } from "luxon";
import type {
  EntityLinkRecord,
  EvaluationRecord,
  ExperimentRecord,
  HypothesisRecord,
  MeasurementRecord,
  ResearchProjectRecord,
  ResearchStatus,
  ResearchTaskRecord,
  ResearchTaskVerificationRecord,
  ResearchTaskVerificationStatus,
  Timestamp,
} from "../../domain/records";
import { dateTimeModule } from "../../modules/date-time";
import { numberModule } from "../../modules/number";

export type ResearchMapTone = "neutral" | "active" | "success" | "warning" | "danger";

export type ResearchMapRange = {
  startAt: Timestamp;
  endAt: Timestamp;
  durationMs: number;
};

export type ResearchMapTickKind = "major" | "minor";

export type ResearchMapTick = {
  id: string;
  kind: ResearchMapTickKind;
  label: string;
  x: number;
};

export type ResearchMapScaleKind = "minute" | "hour" | "day";

export type ResearchMapTicks = {
  scaleKind: ResearchMapScaleKind;
  major: ResearchMapTick[];
  minor: ResearchMapTick[];
};

export type ResearchMapLabelSlot = 0 | 1;

export type ResearchMapExperimentNode = {
  id: string;
  experiment: ExperimentRecord;
  title: string;
  summary: string;
  occurredAt: Timestamp;
  tone: ResearchMapTone;
  verificationStatus: ResearchTaskVerificationStatus | undefined;
  evaluationCount: number;
  measurementCount: number;
  labelSlot: ResearchMapLabelSlot;
  labelHidden: boolean;
};

export type ResearchMapMarker =
  | { kind: "node"; xPercent: number; node: ResearchMapExperimentNode }
  | {
      kind: "cluster";
      id: string;
      xPercent: number;
      tone: ResearchMapTone;
      nodes: ResearchMapExperimentNode[];
    };

export type ResearchMapLane = {
  id: string;
  hypothesis: HypothesisRecord;
  title: string;
  summary: string;
  tone: ResearchMapTone;
  span: { startAt: Timestamp; endAt: Timestamp };
  researchTaskCount: number;
  verifiedResearchTaskCount: number;
  experimentCount: number;
  evidenceCount: number;
  verificationStatus: ResearchTaskVerificationStatus | undefined;
  experiments: ResearchMapExperimentNode[];
  markers: ResearchMapMarker[];
};

export type ResearchMapEdge = {
  id: string;
  fromExperimentId: string;
  toExperimentId: string;
  fromLaneId: string;
  toLaneId: string;
  tone: "normal" | "danger";
};

export type ResearchMapRunState = "live" | "finished";

export type ResearchMapModel = {
  project: ResearchProjectRecord | undefined;
  range: ResearchMapRange;
  nowAt: Timestamp;
  runState: ResearchMapRunState;
  ticks: ResearchMapTicks;
  lanes: ResearchMapLane[];
  edges: ResearchMapEdge[];
  canvasWidthPx: number;
  zoomLevel: number;
};

export type BuildResearchMapModelInput = {
  project: ResearchProjectRecord | undefined;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  entityLinks: EntityLinkRecord[];
  researchTasks: ResearchTaskRecord[];
  verifications: ResearchTaskVerificationRecord[];
  evaluations: EvaluationRecord[];
  measurements: MeasurementRecord[];
  now?: Timestamp;
  viewportWidthPx?: number;
  zoomLevel?: number;
};

const SECOND_MS = 1_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MIN_VISIBLE_RANGE_MS = 30 * MINUTE_MS;
const LABEL_SLOTS: ResearchMapLabelSlot[] = [0, 1];
const DEFAULT_VIEWPORT_WIDTH_PX = 1200;
const MIN_PX_PER_EXPERIMENT = 30;
const MIN_ZOOM_LEVEL = 0.5;
const LABEL_PX = 150;
const LABEL_GUTTER_PX = 12;
const MIN_TICK_PX = 60;
const CLUSTER_PX = 24;

const terminalResearchStatuses = new Set<ResearchStatus>(["done", "canceled", "failed"]);

type TickScaleTier = {
  minorMs: number;
  majorMs: number;
  scaleKind: ResearchMapScaleKind;
  formatter: (dt: DateTime, kind: ResearchMapTickKind) => string;
};

const TICK_SCALE_TIERS: TickScaleTier[] = [
  {
    minorMs: 10 * SECOND_MS,
    majorMs: MINUTE_MS,
    scaleKind: "minute",
    formatter: formatTimeWithSeconds,
  },
  {
    minorMs: 30 * SECOND_MS,
    majorMs: 2 * MINUTE_MS,
    scaleKind: "minute",
    formatter: formatTimeWithSeconds,
  },
  {
    minorMs: MINUTE_MS,
    majorMs: 5 * MINUTE_MS,
    scaleKind: "minute",
    formatter: formatTimeOfDay,
  },
  {
    minorMs: 2 * MINUTE_MS,
    majorMs: 10 * MINUTE_MS,
    scaleKind: "minute",
    formatter: formatTimeOfDay,
  },
  {
    minorMs: 5 * MINUTE_MS,
    majorMs: 15 * MINUTE_MS,
    scaleKind: "minute",
    formatter: formatTimeOfDay,
  },
  {
    minorMs: 10 * MINUTE_MS,
    majorMs: 30 * MINUTE_MS,
    scaleKind: "minute",
    formatter: formatTimeOfDay,
  },
  {
    minorMs: 30 * MINUTE_MS,
    majorMs: HOUR_MS,
    scaleKind: "hour",
    formatter: formatTimeOfDay,
  },
  {
    minorMs: HOUR_MS,
    majorMs: 3 * HOUR_MS,
    scaleKind: "hour",
    formatter: formatTimeOfDay,
  },
  {
    minorMs: HOUR_MS,
    majorMs: 6 * HOUR_MS,
    scaleKind: "hour",
    formatter: formatTimeOfDay,
  },
  {
    minorMs: 4 * HOUR_MS,
    majorMs: DAY_MS,
    scaleKind: "hour",
    formatter: (dt, kind) => (kind === "major" ? formatShortDate(dt) : formatTimeOfDay(dt)),
  },
  {
    minorMs: 12 * HOUR_MS,
    majorMs: 2 * DAY_MS,
    scaleKind: "day",
    formatter: formatShortDate,
  },
  {
    minorMs: 2 * DAY_MS,
    majorMs: 7 * DAY_MS,
    scaleKind: "day",
    formatter: formatShortDate,
  },
];

export function buildResearchMapModel({
  project,
  hypotheses,
  experiments,
  entityLinks,
  researchTasks,
  verifications,
  evaluations,
  measurements,
  now,
  viewportWidthPx,
  zoomLevel,
}: BuildResearchMapModelInput): ResearchMapModel {
  void entityLinks;
  const resolvedViewportWidthPx = viewportWidthPx ?? DEFAULT_VIEWPORT_WIDTH_PX;
  const resolvedZoomLevel = Math.max(zoomLevel ?? 1, MIN_ZOOM_LEVEL);
  const canvasWidthPx = computeCanvasWidthPx({
    viewportWidthPx: resolvedViewportWidthPx,
    zoomLevel: resolvedZoomLevel,
    experimentCount: experiments.length,
  });
  const wallClockNow = now ?? dateTimeModule.nowIso();
  const runState: ResearchMapRunState = isTerminalProject({ project }) ? "finished" : "live";
  const resolvedNow = runState === "finished" && project ? project.updatedAt : wallClockNow;
  const experimentById = new Map(experiments.map((experiment) => [experiment.id, experiment]));
  const childExperimentIdsByParentId = childrenByParent({ experiments });
  const researchTaskById = new Map(
    researchTasks.map((researchTask) => [researchTask.id, researchTask]),
  );
  const verificationsByResearchTaskId = latestVerificationsByResearchTaskId({ verifications });
  const evaluationsByExperimentId = groupEvaluationsByExperimentId({ evaluations });
  const measurementsByEvaluationId = groupMeasurementsByEvaluationId({ measurements });
  const linkedExperimentIdsByHypothesisId = associatedExperimentIdsByHypothesisId({
    experiments,
  });

  const allExplicitlyLinkedExperimentIds = new Set<string>();
  for (const ids of linkedExperimentIdsByHypothesisId.values()) {
    for (const id of ids) {
      allExplicitlyLinkedExperimentIds.add(id);
    }
  }

  const rawLanes = [...hypotheses].sort(compareCreated).map((hypothesis) => {
    const linkedExperimentIds = linkedExperimentIdsByHypothesisId.get(hypothesis.id) ?? new Set();
    const stopAtExperimentIds = new Set<string>();
    for (const id of allExplicitlyLinkedExperimentIds) {
      if (!linkedExperimentIds.has(id)) {
        stopAtExperimentIds.add(id);
      }
    }
    const expandedExperimentIds = expandExperimentIds({
      experimentIds: linkedExperimentIds,
      childExperimentIdsByParentId,
      stopAtExperimentIds,
    });
    const laneResearchTasks = researchTasks.filter(
      (researchTask) => researchTask.hypothesisId === hypothesis.id,
    );
    const laneExperiments = [...expandedExperimentIds]
      .map((experimentId) => experimentById.get(experimentId))
      .filter((experiment): experiment is ExperimentRecord => experiment !== undefined)
      .sort(compareCreated)
      .map((experiment) =>
        experimentNodeFrom({
          experiment,
          researchTaskById,
          verificationsByResearchTaskId,
          evaluationsByExperimentId,
          measurementsByEvaluationId,
        }),
      );
    const laneVerifications = laneResearchTasks
      .map((researchTask) => verificationsByResearchTaskId.get(researchTask.id))
      .filter(
        (verification): verification is ResearchTaskVerificationRecord =>
          verification !== undefined,
      );
    const laneTimestamps: Timestamp[] = [
      hypothesis.createdAt,
      hypothesis.updatedAt,
      ...laneResearchTasks.flatMap((researchTask) => [
        researchTask.createdAt,
        researchTask.updatedAt,
      ]),
      ...laneExperiments.flatMap((node) => [
        node.experiment.createdAt,
        node.experiment.updatedAt,
        ...(evaluationsByExperimentId.get(node.id) ?? []).flatMap((evaluation) => [
          evaluation.createdAt,
          evaluation.updatedAt,
        ]),
      ]),
    ];
    const activeEnd =
      runState === "finished" || terminalResearchStatuses.has(hypothesis.status)
        ? dateTimeModule.maxIso(laneTimestamps)
        : dateTimeModule.maxIso([...laneTimestamps, resolvedNow]);

    return {
      id: hypothesis.id,
      hypothesis,
      title: hypothesis.title,
      summary: hypothesis.summary,
      tone: toneFromResearchStatus({ status: hypothesis.status }),
      span: {
        startAt: hypothesis.createdAt,
        endAt: activeEnd,
      },
      researchTaskCount: laneResearchTasks.length,
      verifiedResearchTaskCount: laneResearchTasks.filter(
        (researchTask) => researchTask.status === "verified",
      ).length,
      experimentCount: laneExperiments.length,
      evidenceCount: evidenceCountForLane({ laneExperiments }),
      verificationStatus: dominantVerificationStatus({ verifications: laneVerifications }),
      experiments: laneExperiments,
    };
  });

  const range = rangeFromInputs({ project, lanes: rawLanes, now: resolvedNow });
  const lanes = rawLanes.map((lane) => {
    const markers = buildLaneMarkers({
      experiments: lane.experiments,
      range,
      canvasWidthPx,
    });
    return {
      ...lane,
      experiments: experimentsFromMarkers({ markers }),
      markers,
    };
  });

  return {
    project,
    range,
    nowAt: resolvedNow,
    runState,
    ticks: ticksForRange({ range, canvasWidthPx }),
    lanes,
    edges: edgesFromLanes({ lanes }),
    canvasWidthPx,
    zoomLevel: resolvedZoomLevel,
  };
}

function computeCanvasWidthPx({
  viewportWidthPx,
  zoomLevel,
  experimentCount,
}: {
  viewportWidthPx: number;
  zoomLevel: number;
  experimentCount: number;
}): number {
  const fitWidth = Math.max(viewportWidthPx, experimentCount * MIN_PX_PER_EXPERIMENT);
  return Math.round(fitWidth * Math.max(zoomLevel, MIN_ZOOM_LEVEL));
}

function isTerminalProject({ project }: { project: ResearchProjectRecord | undefined }): boolean {
  if (!project) {
    return false;
  }
  return (
    project.status === "complete" || project.status === "failed" || project.status === "canceled"
  );
}

export function xForTimestamp({
  range,
  timestamp,
}: {
  range: ResearchMapRange;
  timestamp: Timestamp;
}): number {
  const start = DateTime.fromISO(range.startAt);
  const end = DateTime.fromISO(range.endAt);
  const value = DateTime.fromISO(timestamp);
  if (!start.isValid || !end.isValid || !value.isValid || end <= start) {
    return 0;
  }
  return numberModule.clamp(
    ((value.toMillis() - start.toMillis()) / (end.toMillis() - start.toMillis())) * 100,
    0,
    100,
  );
}

export function formatNowLabel({
  nowAt,
  range,
}: {
  nowAt: Timestamp;
  range: ResearchMapRange;
}): string {
  const dt = DateTime.fromISO(nowAt);
  if (!dt.isValid) {
    return "Now";
  }
  return range.durationMs >= 24 * HOUR_MS
    ? `${formatShortDate(dt)} ${formatTimeOfDay(dt)}`
    : formatTimeOfDay(dt);
}

export function formatRunDuration({ range }: { range: ResearchMapRange }): string {
  const ms = Math.max(range.durationMs, 0);
  if (ms < HOUR_MS) {
    return `${Math.max(1, Math.round(ms / MINUTE_MS))}m`;
  }
  if (ms < DAY_MS) {
    const hours = Math.floor(ms / HOUR_MS);
    const minutes = Math.round((ms - hours * HOUR_MS) / MINUTE_MS);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.round((ms - days * DAY_MS) / HOUR_MS);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function rangeFromInputs({
  project,
  lanes,
  now,
}: {
  project: ResearchProjectRecord | undefined;
  lanes: Array<{
    span: { startAt: Timestamp; endAt: Timestamp };
    experiments: ResearchMapExperimentNode[];
  }>;
  now: Timestamp;
}): ResearchMapRange {
  const startCandidates = dateTimeModule.collectIso([
    project?.createdAt,
    ...lanes.map((lane) => lane.span.startAt),
    ...lanes.flatMap((lane) => lane.experiments.map((node) => node.occurredAt)),
  ]);
  const endCandidates = dateTimeModule.collectIso([
    now,
    project?.updatedAt,
    ...lanes.map((lane) => lane.span.endAt),
    ...lanes.flatMap((lane) => lane.experiments.map((node) => node.occurredAt)),
  ]);

  const nowDt = DateTime.fromISO(now);
  const startMs =
    startCandidates.length > 0
      ? dateTimeModule.minMillis(startCandidates)
      : nowDt.toMillis() - MIN_VISIBLE_RANGE_MS;
  const endMs =
    endCandidates.length > 0 ? dateTimeModule.maxMillis(endCandidates) : nowDt.toMillis();

  const naturalDuration = Math.max(endMs - startMs, 5 * MINUTE_MS);
  const padMs = Math.min(Math.max(naturalDuration * 0.05, MINUTE_MS), DAY_MS);
  let paddedStart = startMs - padMs;
  let paddedEnd = endMs + padMs;
  const totalDuration = paddedEnd - paddedStart;

  if (totalDuration < MIN_VISIBLE_RANGE_MS) {
    const shortfall = MIN_VISIBLE_RANGE_MS - totalDuration;
    paddedStart -= shortfall / 2;
    paddedEnd += shortfall / 2;
  }

  return {
    startAt: dateTimeModule.requireIso(DateTime.fromMillis(paddedStart, { zone: "utc" })),
    endAt: dateTimeModule.requireIso(DateTime.fromMillis(paddedEnd, { zone: "utc" })),
    durationMs: paddedEnd - paddedStart,
  };
}

function ticksForRange({
  range,
  canvasWidthPx,
}: {
  range: ResearchMapRange;
  canvasWidthPx: number;
}): ResearchMapTicks {
  const tier = pickTickTier({ durationMs: range.durationMs, canvasWidthPx });
  return {
    scaleKind: tier.scaleKind,
    minor: ticksAtInterval({ range, intervalMs: tier.minorMs, kind: "minor", tier }),
    major: ticksAtInterval({ range, intervalMs: tier.majorMs, kind: "major", tier }),
  };
}

function pickTickTier({
  durationMs,
  canvasWidthPx,
}: {
  durationMs: number;
  canvasWidthPx: number;
}): TickScaleTier {
  for (const tier of TICK_SCALE_TIERS) {
    const minorPx = (tier.minorMs / durationMs) * canvasWidthPx;
    if (minorPx >= MIN_TICK_PX) {
      return tier;
    }
  }
  return TICK_SCALE_TIERS[TICK_SCALE_TIERS.length - 1];
}

function ticksAtInterval({
  range,
  intervalMs,
  kind,
  tier,
}: {
  range: ResearchMapRange;
  intervalMs: number;
  kind: ResearchMapTickKind;
  tier: TickScaleTier;
}): ResearchMapTick[] {
  const start = DateTime.fromISO(range.startAt);
  const end = DateTime.fromISO(range.endAt);
  if (!start.isValid || !end.isValid || end <= start) {
    return [];
  }
  const ticks: ResearchMapTick[] = [];
  let cursor = alignedNext({ dt: start, intervalMs });
  while (cursor <= end) {
    const isoTimestamp = cursor.toISO();
    if (!isoTimestamp) {
      break;
    }
    ticks.push({
      id: `${kind}:${isoTimestamp}`,
      kind,
      label: tier.formatter(cursor, kind),
      x: xForTimestamp({ range, timestamp: isoTimestamp }),
    });
    cursor = cursor.plus({ milliseconds: intervalMs });
  }
  return ticks;
}

function alignedNext({ dt, intervalMs }: { dt: DateTime; intervalMs: number }): DateTime {
  const startOfDay = dt.startOf("day");
  const elapsed = dt.toMillis() - startOfDay.toMillis();
  const stepsBefore = Math.ceil(elapsed / intervalMs);
  return startOfDay.plus({ milliseconds: stepsBefore * intervalMs });
}

function buildLaneMarkers({
  experiments,
  range,
  canvasWidthPx,
}: {
  experiments: ResearchMapExperimentNode[];
  range: ResearchMapRange;
  canvasWidthPx: number;
}): ResearchMapMarker[] {
  const groups = groupExperimentsByProximity({ experiments, range, canvasWidthPx });
  const minGapPx = LABEL_PX + LABEL_GUTTER_PX;
  const lastLabelPxBySlot = new Map<ResearchMapLabelSlot, number>();
  return groups.map((group) => {
    if (group.nodes.length === 1) {
      const node = group.nodes[0];
      if (!node) {
        throw new Error("group with one node should have a node at index 0");
      }
      const labeled = assignLabelSlot({ node, xPx: group.xPx, lastLabelPxBySlot, minGapPx });
      return { kind: "node", xPercent: group.xPercent, node: labeled };
    }
    return {
      kind: "cluster",
      id: clusterIdFor({ nodes: group.nodes }),
      xPercent: group.xPercent,
      tone: dominantTone({ nodes: group.nodes }),
      nodes: group.nodes,
    };
  });
}

type ExperimentGroup = {
  nodes: ResearchMapExperimentNode[];
  xPercent: number;
  xPx: number;
};

function groupExperimentsByProximity({
  experiments,
  range,
  canvasWidthPx,
}: {
  experiments: ResearchMapExperimentNode[];
  range: ResearchMapRange;
  canvasWidthPx: number;
}): ExperimentGroup[] {
  const groups: ExperimentGroup[] = [];
  let pendingNodes: ResearchMapExperimentNode[] = [];
  let pendingFirstXPercent = 0;
  let pendingFirstXPx = 0;
  let pendingLastXPx = 0;
  for (const node of experiments) {
    const xPercent = xForTimestamp({ range, timestamp: node.occurredAt });
    const xPx = (xPercent / 100) * canvasWidthPx;
    if (pendingNodes.length === 0) {
      pendingNodes = [node];
      pendingFirstXPercent = xPercent;
      pendingFirstXPx = xPx;
      pendingLastXPx = xPx;
      continue;
    }
    if (xPx - pendingLastXPx <= CLUSTER_PX) {
      pendingNodes.push(node);
      pendingLastXPx = xPx;
      continue;
    }
    groups.push({
      nodes: pendingNodes,
      xPercent: groupXPercent({
        nodes: pendingNodes,
        firstXPercent: pendingFirstXPercent,
        firstXPx: pendingFirstXPx,
        lastXPx: pendingLastXPx,
        canvasWidthPx,
      }),
      xPx: (pendingFirstXPx + pendingLastXPx) / 2,
    });
    pendingNodes = [node];
    pendingFirstXPercent = xPercent;
    pendingFirstXPx = xPx;
    pendingLastXPx = xPx;
  }
  if (pendingNodes.length > 0) {
    groups.push({
      nodes: pendingNodes,
      xPercent: groupXPercent({
        nodes: pendingNodes,
        firstXPercent: pendingFirstXPercent,
        firstXPx: pendingFirstXPx,
        lastXPx: pendingLastXPx,
        canvasWidthPx,
      }),
      xPx: (pendingFirstXPx + pendingLastXPx) / 2,
    });
  }
  return groups;
}

function groupXPercent({
  nodes,
  firstXPercent,
  firstXPx,
  lastXPx,
  canvasWidthPx,
}: {
  nodes: ResearchMapExperimentNode[];
  firstXPercent: number;
  firstXPx: number;
  lastXPx: number;
  canvasWidthPx: number;
}): number {
  if (nodes.length === 1 || canvasWidthPx <= 0) {
    return firstXPercent;
  }
  const midPx = (firstXPx + lastXPx) / 2;
  return (midPx / canvasWidthPx) * 100;
}

function assignLabelSlot({
  node,
  xPx,
  lastLabelPxBySlot,
  minGapPx,
}: {
  node: ResearchMapExperimentNode;
  xPx: number;
  lastLabelPxBySlot: Map<ResearchMapLabelSlot, number>;
  minGapPx: number;
}): ResearchMapExperimentNode {
  for (const slot of LABEL_SLOTS) {
    const previousPx = lastLabelPxBySlot.get(slot);
    if (previousPx === undefined || xPx - previousPx >= minGapPx) {
      lastLabelPxBySlot.set(slot, xPx);
      return { ...node, labelSlot: slot, labelHidden: false };
    }
  }
  return { ...node, labelSlot: 0, labelHidden: true };
}

function clusterIdFor({ nodes }: { nodes: ResearchMapExperimentNode[] }): string {
  return `cluster:${nodes.map((node) => node.id).join(",")}`;
}

const TONE_PRIORITY: Record<ResearchMapTone, number> = {
  danger: 4,
  warning: 3,
  active: 2,
  success: 1,
  neutral: 0,
};

function dominantTone({ nodes }: { nodes: ResearchMapExperimentNode[] }): ResearchMapTone {
  let chosen: ResearchMapTone = "neutral";
  for (const node of nodes) {
    if (TONE_PRIORITY[node.tone] > TONE_PRIORITY[chosen]) {
      chosen = node.tone;
    }
  }
  return chosen;
}

function experimentsFromMarkers({
  markers,
}: {
  markers: ResearchMapMarker[];
}): ResearchMapExperimentNode[] {
  const out: ResearchMapExperimentNode[] = [];
  for (const marker of markers) {
    if (marker.kind === "node") {
      out.push(marker.node);
    } else {
      for (const node of marker.nodes) {
        out.push({ ...node, labelHidden: true, labelSlot: 0 });
      }
    }
  }
  return out;
}

function experimentNodeFrom({
  experiment,
  researchTaskById,
  verificationsByResearchTaskId,
  evaluationsByExperimentId,
  measurementsByEvaluationId,
}: {
  experiment: ExperimentRecord;
  researchTaskById: Map<string, ResearchTaskRecord>;
  verificationsByResearchTaskId: Map<string, ResearchTaskVerificationRecord>;
  evaluationsByExperimentId: Map<string, EvaluationRecord[]>;
  measurementsByEvaluationId: Map<string, MeasurementRecord[]>;
}): ResearchMapExperimentNode {
  const researchTask = experiment.createdByResearchTaskId
    ? researchTaskById.get(experiment.createdByResearchTaskId)
    : undefined;
  const verification = researchTask
    ? verificationsByResearchTaskId.get(researchTask.id)
    : undefined;
  const experimentEvaluations = evaluationsByExperimentId.get(experiment.id) ?? [];
  const measurementCount = experimentEvaluations.reduce(
    (count, evaluation) => count + (measurementsByEvaluationId.get(evaluation.id)?.length ?? 0),
    0,
  );

  return {
    id: experiment.id,
    experiment,
    title: experiment.title,
    summary: experiment.summary,
    occurredAt: experiment.createdAt,
    tone: verification
      ? toneFromVerificationStatus({ status: verification.status })
      : toneFromResearchStatus({ status: experiment.status }),
    verificationStatus: verification?.status,
    evaluationCount: experimentEvaluations.length,
    measurementCount,
    labelSlot: 0,
    labelHidden: false,
  };
}

function associatedExperimentIdsByHypothesisId({
  experiments,
}: {
  experiments: ExperimentRecord[];
}): Map<string, Set<string>> {
  const links = new Map<string, Set<string>>();
  for (const experiment of experiments) {
    const existing = links.get(experiment.associatedHypothesisId);
    if (existing) {
      existing.add(experiment.id);
    } else {
      links.set(experiment.associatedHypothesisId, new Set([experiment.id]));
    }
  }
  return links;
}

function expandExperimentIds({
  experimentIds,
  childExperimentIdsByParentId,
  stopAtExperimentIds,
}: {
  experimentIds: Set<string>;
  childExperimentIdsByParentId: Map<string, string[]>;
  stopAtExperimentIds: Set<string>;
}): Set<string> {
  const expanded = new Set(experimentIds);
  const queue = [...experimentIds];
  while (queue.length > 0) {
    const experimentId = queue.shift();
    if (!experimentId) {
      continue;
    }
    for (const childId of childExperimentIdsByParentId.get(experimentId) ?? []) {
      if (expanded.has(childId)) {
        continue;
      }
      if (stopAtExperimentIds.has(childId)) {
        continue;
      }
      expanded.add(childId);
      queue.push(childId);
    }
  }
  return expanded;
}

function childrenByParent({
  experiments,
}: {
  experiments: ExperimentRecord[];
}): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const experiment of experiments) {
    if (experiment.parentExperimentId) {
      addMapArrayValue({
        map: children,
        key: experiment.parentExperimentId,
        value: experiment.id,
      });
    }
  }
  return children;
}

function latestVerificationsByResearchTaskId({
  verifications,
}: {
  verifications: ResearchTaskVerificationRecord[];
}): Map<string, ResearchTaskVerificationRecord> {
  const map = new Map<string, ResearchTaskVerificationRecord>();
  for (const verification of [...verifications].sort(compareCreated)) {
    map.set(verification.researchTaskId, verification);
  }
  return map;
}

function groupEvaluationsByExperimentId({
  evaluations,
}: {
  evaluations: EvaluationRecord[];
}): Map<string, EvaluationRecord[]> {
  const map = new Map<string, EvaluationRecord[]>();
  for (const evaluation of evaluations) {
    if (evaluation.associatedExperimentId) {
      addMapArrayValue({
        map,
        key: evaluation.associatedExperimentId,
        value: evaluation,
      });
    }
  }
  return map;
}

function groupMeasurementsByEvaluationId({
  measurements,
}: {
  measurements: MeasurementRecord[];
}): Map<string, MeasurementRecord[]> {
  const map = new Map<string, MeasurementRecord[]>();
  for (const measurement of measurements) {
    if (measurement.evaluationId) {
      addMapArrayValue({
        map,
        key: measurement.evaluationId,
        value: measurement,
      });
    }
  }
  return map;
}

function edgesFromLanes({ lanes }: { lanes: ResearchMapLane[] }): ResearchMapEdge[] {
  const nodeLocationByExperimentId = new Map<
    string,
    { laneId: string; node: ResearchMapExperimentNode }
  >();
  for (const lane of lanes) {
    for (const node of lane.experiments) {
      nodeLocationByExperimentId.set(node.id, { laneId: lane.id, node });
    }
  }

  const edges: ResearchMapEdge[] = [];
  for (const [toExperimentId, location] of nodeLocationByExperimentId) {
    const parentExperimentId = location.node.experiment.parentExperimentId;
    if (!parentExperimentId) {
      continue;
    }
    const parentLocation = nodeLocationByExperimentId.get(parentExperimentId);
    if (!parentLocation) {
      continue;
    }
    if (parentLocation.laneId === location.laneId) {
      continue;
    }
    edges.push({
      id: `${parentExperimentId}/${toExperimentId}`,
      fromExperimentId: parentExperimentId,
      toExperimentId,
      fromLaneId: parentLocation.laneId,
      toLaneId: location.laneId,
      tone: location.node.tone === "danger" ? "danger" : "normal",
    });
  }
  return edges;
}

function dominantVerificationStatus({
  verifications,
}: {
  verifications: ResearchTaskVerificationRecord[];
}): ResearchTaskVerificationStatus | undefined {
  if (verifications.some((verification) => verification.status === "fail")) {
    return "fail";
  }
  if (verifications.some((verification) => verification.status === "suspicious")) {
    return "suspicious";
  }
  if (verifications.some((verification) => verification.status === "needs_more_evidence")) {
    return "needs_more_evidence";
  }
  if (verifications.some((verification) => verification.status === "pass")) {
    return "pass";
  }
  return verifications[0]?.status;
}

function evidenceCountForLane({
  laneExperiments,
}: {
  laneExperiments: ResearchMapExperimentNode[];
}): number {
  return laneExperiments.reduce(
    (count, node) => count + 1 + node.evaluationCount + node.measurementCount,
    0,
  );
}

function toneFromResearchStatus({ status }: { status: ResearchStatus }): ResearchMapTone {
  switch (status) {
    case "active":
    case "accepted":
      return "active";
    case "in_review":
      return "warning";
    case "done":
      return "success";
    case "failed":
      return "danger";
    case "triage":
    case "canceled":
      return "neutral";
  }
}

function toneFromVerificationStatus({
  status,
}: {
  status: ResearchTaskVerificationStatus;
}): ResearchMapTone {
  switch (status) {
    case "pass":
      return "success";
    case "fail":
      return "danger";
    case "suspicious":
    case "needs_more_evidence":
      return "warning";
    case "pending":
      return "neutral";
  }
}

function compareCreated<Row extends { createdAt: string; id: string }>(
  left: Row,
  right: Row,
): number {
  const createdComparison = left.createdAt.localeCompare(right.createdAt);
  if (createdComparison !== 0) {
    return createdComparison;
  }
  return left.id.localeCompare(right.id);
}

function addMapArrayValue<Value>({
  map,
  key,
  value,
}: {
  map: Map<string, Value[]>;
  key: string;
  value: Value;
}): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return;
  }
  map.set(key, [value]);
}

function formatTimeOfDay(dt: DateTime): string {
  return dt.toFormat("HH:mm");
}

function formatTimeWithSeconds(dt: DateTime, kind: ResearchMapTickKind): string {
  return kind === "major" ? dt.toFormat("HH:mm") : dt.toFormat("HH:mm:ss");
}

function formatShortDate(dt: DateTime): string {
  return dt.toFormat("LLL d").toUpperCase();
}
