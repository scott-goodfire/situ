import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  ENTITY_LINK_FIXTURES,
  EVALUATION_FIXTURES,
  EXPERIMENT_FIXTURES,
  HYPOTHESIS_FIXTURES,
  MEASUREMENT_FIXTURES,
  RESEARCH_PROJECT_FIXTURES,
  RESEARCH_TASK_FIXTURES,
  RESEARCH_TASK_VERIFICATION_FIXTURES,
} from "../../fixtures";
import type { ExperimentRecord, HypothesisRecord, Timestamp } from "../../domain/records";
import {
  buildResearchMapModel,
  formatRunDuration,
  xForTimestamp,
  type ResearchMapRange,
} from "./research-map-model";

const NOW: Timestamp = "2026-05-10T18:00:00.000Z";

function at(offsetMinutes: number): Timestamp {
  const dt = DateTime.fromISO(NOW, { zone: "utc" }).plus({ minutes: offsetMinutes });
  const iso = dt.toISO();
  if (iso === null) {
    throw new Error("test fixture produced invalid ISO");
  }
  return iso;
}

function range({
  startMinutesAgo,
  endMinutesAhead,
}: {
  startMinutesAgo: number;
  endMinutesAhead: number;
}): ResearchMapRange {
  const startAt = at(-startMinutesAgo);
  const endAt = at(endMinutesAhead);
  const durationMs = (startMinutesAgo + endMinutesAhead) * 60_000;
  return { startAt, endAt, durationMs };
}

function hypothesis(
  input: Partial<HypothesisRecord> & Pick<HypothesisRecord, "id">,
): HypothesisRecord {
  return {
    createdByResearchTaskId: null,
    createdByAgentId: null,
    title: input.id,
    summary: "",
    status: "active",
    createdAt: at(-30),
    updatedAt: at(-5),
    ...input,
  };
}

function experiment(
  input: Partial<ExperimentRecord> & Pick<ExperimentRecord, "id">,
): ExperimentRecord {
  return {
    createdByResearchTaskId: null,
    createdByAgentId: null,
    associatedHypothesisId: "h1",
    parentExperimentId: null,
    title: input.id,
    summary: "",
    status: "active",
    worktreePath: null,
    baseCommit: null,
    candidateCommit: null,
    createdAt: at(-15),
    updatedAt: at(-5),
    ...input,
  };
}

describe("buildResearchMapModel", () => {
  it("builds hypothesis lanes with linked experiment forks without same-lane edges", () => {
    const model = buildResearchMapModel({
      project: RESEARCH_PROJECT_FIXTURES[0],
      hypotheses: HYPOTHESIS_FIXTURES,
      experiments: EXPERIMENT_FIXTURES,
      entityLinks: ENTITY_LINK_FIXTURES,
      researchTasks: RESEARCH_TASK_FIXTURES,
      verifications: RESEARCH_TASK_VERIFICATION_FIXTURES,
      evaluations: EVALUATION_FIXTURES,
      measurements: MEASUREMENT_FIXTURES,
      now: NOW,
    });

    const cacheLane = model.lanes.find((lane) => lane.id === "hyp_01HZQK5J7C8X3Q9V");
    expect(cacheLane?.experiments.map((node) => node.id)).toContain("exp_01HZQK5J7C8X3Q9V");
    expect(cacheLane?.experiments.map((node) => node.id)).toContain("exp_02HZQK5J7C8X3Q9V");
    expect(model.edges.some((edge) => edge.toExperimentId === "exp_02HZQK5J7C8X3Q9V")).toBe(false);
  });

  it("keeps fork edges when parent and child experiments are in different hypothesis lanes", () => {
    const model = buildResearchMapModel({
      project: undefined,
      hypotheses: [
        hypothesis({ id: "h_parent", createdAt: at(-40), updatedAt: at(-1) }),
        hypothesis({ id: "h_child", createdAt: at(-35), updatedAt: at(-1) }),
      ],
      experiments: [
        experiment({
          id: "parent",
          associatedHypothesisId: "h_parent",
          createdAt: at(-30),
        }),
        experiment({
          id: "child",
          associatedHypothesisId: "h_child",
          parentExperimentId: "parent",
          createdAt: at(-20),
        }),
      ],
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
    });

    expect(model.edges).toEqual([
      expect.objectContaining({
        fromExperimentId: "parent",
        toExperimentId: "child",
        fromLaneId: "h_parent",
        toLaneId: "h_child",
      }),
    ]);
  });

  it("scales tick interval down for short runs and up for long runs", () => {
    const shortRun = buildResearchMapModel({
      project: undefined,
      hypotheses: [hypothesis({ id: "h1", createdAt: at(-20), updatedAt: at(-2) })],
      experiments: [],
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
    });
    expect(shortRun.ticks.scaleKind).toBe("minute");
    expect(shortRun.range.durationMs).toBeLessThanOrEqual(60 * 60_000);

    const dayRun = buildResearchMapModel({
      project: undefined,
      hypotheses: [hypothesis({ id: "h1", createdAt: at(-12 * 60), updatedAt: at(-30) })],
      experiments: [],
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
    });
    expect(dayRun.ticks.scaleKind).toBe("hour");
    expect(dayRun.range.durationMs).toBeGreaterThan(6 * 60 * 60_000);
  });

  it("hides labels and assigns alternating slots for clustered experiments", () => {
    const hypothesisId = "h_dense";
    const experiments = [
      experiment({ id: "e1", associatedHypothesisId: hypothesisId, createdAt: at(-20) }),
      experiment({ id: "e2", associatedHypothesisId: hypothesisId, createdAt: at(-19) }),
      experiment({ id: "e3", associatedHypothesisId: hypothesisId, createdAt: at(-18) }),
      experiment({ id: "e4", associatedHypothesisId: hypothesisId, createdAt: at(-17) }),
    ];
    const model = buildResearchMapModel({
      project: undefined,
      hypotheses: [hypothesis({ id: hypothesisId, createdAt: at(-30), updatedAt: at(-1) })],
      experiments,
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
    });

    const lane = model.lanes.find((candidate) => candidate.id === hypothesisId);
    expect(lane).toBeDefined();
    const slots = lane?.experiments.map((node) => node.labelSlot) ?? [];
    expect(new Set(slots).size).toBeGreaterThan(1);
    const hidden = lane?.experiments.filter((node) => node.labelHidden) ?? [];
    expect(hidden.length).toBeGreaterThan(0);
  });

  it("places nowAt at a meaningful position inside the padded range", () => {
    const model = buildResearchMapModel({
      project: undefined,
      hypotheses: [hypothesis({ id: "h1", createdAt: at(-60), updatedAt: at(-2) })],
      experiments: [],
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
    });
    const nowX = xForTimestamp({ range: model.range, timestamp: model.nowAt });
    expect(nowX).toBeGreaterThan(50);
    expect(nowX).toBeLessThan(100);
  });

  it("maps timestamps into the range linearly", () => {
    const r = range({ startMinutesAgo: 30, endMinutesAhead: 30 });
    expect(xForTimestamp({ range: r, timestamp: r.startAt })).toBe(0);
    expect(xForTimestamp({ range: r, timestamp: r.endAt })).toBe(100);
    expect(xForTimestamp({ range: r, timestamp: NOW })).toBeCloseTo(50, 1);
  });

  it("expands canvas width when zoom level increases", () => {
    const baseInput = {
      project: undefined,
      hypotheses: [hypothesis({ id: "h1", createdAt: at(-30), updatedAt: at(-1) })],
      experiments: [],
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
      viewportWidthPx: 1000,
    };
    const fit = buildResearchMapModel({ ...baseInput, zoomLevel: 1 });
    const zoom4x = buildResearchMapModel({ ...baseInput, zoomLevel: 4 });
    expect(zoom4x.canvasWidthPx).toBe(fit.canvasWidthPx * 4);
    expect(zoom4x.zoomLevel).toBe(4);
  });

  it("allows fractional zoom out below the fit width", () => {
    const baseInput = {
      project: undefined,
      hypotheses: [hypothesis({ id: "h1", createdAt: at(-30), updatedAt: at(-1) })],
      experiments: [],
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
      viewportWidthPx: 1000,
    };
    const fit = buildResearchMapModel({ ...baseInput, zoomLevel: 1 });
    const zoomedOut = buildResearchMapModel({ ...baseInput, zoomLevel: 0.5 });
    expect(zoomedOut.canvasWidthPx).toBe(fit.canvasWidthPx / 2);
    expect(zoomedOut.zoomLevel).toBe(0.5);
  });

  it("picks finer tick intervals as canvas width grows", () => {
    const baseInput = {
      project: undefined,
      hypotheses: [hypothesis({ id: "h1", createdAt: at(-3 * 60), updatedAt: at(-1) })],
      experiments: [],
      entityLinks: [],
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
      viewportWidthPx: 1000,
    };
    const fit = buildResearchMapModel({ ...baseInput, zoomLevel: 1 });
    const zoom8x = buildResearchMapModel({ ...baseInput, zoomLevel: 8 });
    expect(zoom8x.ticks.minor.length).toBeGreaterThan(fit.ticks.minor.length);
  });

  it("reveals more labels when canvas width grows", () => {
    const hypothesisId = "h_grow";
    const experiments = Array.from({ length: 5 }, (_, index) =>
      experiment({
        id: `e${index}`,
        associatedHypothesisId: hypothesisId,
        createdAt: at(-30 + index * 4),
      }),
    );
    const baseInput = {
      project: undefined,
      hypotheses: [hypothesis({ id: hypothesisId, createdAt: at(-40), updatedAt: at(-1) })],
      experiments,
      entityLinks: experiments.map((exp, index) => ({
        id: `lnk_${index}`,
        fromKind: "hypothesis" as const,
        fromId: hypothesisId,
        toKind: "experiment" as const,
        toId: exp.id,
        relationship: "tested-by",
        createdAt: exp.createdAt,
      })),
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
      viewportWidthPx: 800,
    };
    const fit = buildResearchMapModel({ ...baseInput, zoomLevel: 1 });
    const zoom8x = buildResearchMapModel({ ...baseInput, zoomLevel: 8 });
    const visibleAt1x = fit.lanes[0]?.experiments.filter((node) => !node.labelHidden).length ?? 0;
    const visibleAt8x =
      zoom8x.lanes[0]?.experiments.filter((node) => !node.labelHidden).length ?? 0;
    expect(visibleAt8x).toBeGreaterThan(visibleAt1x);
  });

  it("groups near-simultaneous experiments into a cluster marker", () => {
    const hypothesisId = "h_burst";
    const concurrent = Array.from({ length: 5 }, (_, index) =>
      experiment({
        id: `burst_${index}`,
        associatedHypothesisId: hypothesisId,
        createdAt: at(-30),
      }),
    );
    const model = buildResearchMapModel({
      project: undefined,
      hypotheses: [hypothesis({ id: hypothesisId, createdAt: at(-60), updatedAt: at(-1) })],
      experiments: concurrent,
      entityLinks: concurrent.map((exp, index) => ({
        id: `lnk_${index}`,
        fromKind: "hypothesis" as const,
        fromId: hypothesisId,
        toKind: "experiment" as const,
        toId: exp.id,
        relationship: "tested-by",
        createdAt: exp.createdAt,
      })),
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
      viewportWidthPx: 1000,
      zoomLevel: 1,
    });
    const lane = model.lanes.find((candidate) => candidate.id === hypothesisId);
    expect(lane).toBeDefined();
    const clusterMarkers = (lane?.markers ?? []).filter((marker) => marker.kind === "cluster");
    expect(clusterMarkers.length).toBe(1);
    const cluster = clusterMarkers[0];
    if (cluster?.kind !== "cluster") {
      throw new Error("expected cluster marker");
    }
    expect(cluster.nodes.length).toBe(5);
  });

  it("disperses cluster into individual node markers when zoomed in enough", () => {
    const hypothesisId = "h_disperse";
    const spaced = Array.from({ length: 4 }, (_, index) =>
      experiment({
        id: `dz_${index}`,
        associatedHypothesisId: hypothesisId,
        createdAt: at(-60 + index * 3),
      }),
    );
    const baseInput = {
      project: undefined,
      hypotheses: [hypothesis({ id: hypothesisId, createdAt: at(-90), updatedAt: at(-1) })],
      experiments: spaced,
      entityLinks: spaced.map((exp, index) => ({
        id: `lnk_${index}`,
        fromKind: "hypothesis" as const,
        fromId: hypothesisId,
        toKind: "experiment" as const,
        toId: exp.id,
        relationship: "tested-by",
        createdAt: exp.createdAt,
      })),
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
      viewportWidthPx: 600,
    };
    const fit = buildResearchMapModel({ ...baseInput, zoomLevel: 1 });
    const zoom8x = buildResearchMapModel({ ...baseInput, zoomLevel: 8 });
    const fitClusters = (fit.lanes[0]?.markers ?? []).filter((marker) => marker.kind === "cluster");
    const zoomNodes = (zoom8x.lanes[0]?.markers ?? []).filter((marker) => marker.kind === "node");
    expect(fitClusters.length).toBeGreaterThan(0);
    expect(zoomNodes.length).toBe(spaced.length);
  });

  it("derives cluster tone from the most severe member status", () => {
    const hypothesisId = "h_tone";
    const members = [
      experiment({
        id: "ok",
        associatedHypothesisId: hypothesisId,
        createdAt: at(-30),
        status: "active",
      }),
      experiment({
        id: "fail",
        associatedHypothesisId: hypothesisId,
        createdAt: at(-30),
        status: "failed",
      }),
      experiment({
        id: "done",
        associatedHypothesisId: hypothesisId,
        createdAt: at(-30),
        status: "done",
      }),
    ];
    const model = buildResearchMapModel({
      project: undefined,
      hypotheses: [hypothesis({ id: hypothesisId, createdAt: at(-60), updatedAt: at(-1) })],
      experiments: members,
      entityLinks: members.map((exp, index) => ({
        id: `lnk_${index}`,
        fromKind: "hypothesis" as const,
        fromId: hypothesisId,
        toKind: "experiment" as const,
        toId: exp.id,
        relationship: "tested-by",
        createdAt: exp.createdAt,
      })),
      researchTasks: [],
      verifications: [],
      evaluations: [],
      measurements: [],
      now: NOW,
      viewportWidthPx: 1000,
      zoomLevel: 1,
    });
    const cluster = model.lanes[0]?.markers.find((marker) => marker.kind === "cluster");
    if (cluster?.kind !== "cluster") {
      throw new Error("expected cluster marker");
    }
    expect(cluster.tone).toBe("danger");
  });

  it("formats run duration in minute / hour / day units", () => {
    expect(formatRunDuration({ range: range({ startMinutesAgo: 22, endMinutesAhead: 0 }) })).toBe(
      "22m",
    );
    expect(
      formatRunDuration({ range: range({ startMinutesAgo: 4 * 60, endMinutesAhead: 0 }) }),
    ).toBe("4h");
    expect(
      formatRunDuration({ range: range({ startMinutesAgo: 30 * 60 + 15, endMinutesAhead: 0 }) }),
    ).toBe("1d 6h");
  });
});
