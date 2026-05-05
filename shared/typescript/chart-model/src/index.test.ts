import { expect, test } from "bun:test";
import {
  formatMetricDelta,
  heatmapFromTokenFeatureMatrix,
  heatmapCellFor,
  metricSeriesFromSteeringDoseResponse,
  normalizeBuckets,
  normalizeHeatmapMatrix,
  normalizeMetricSeries,
  normalizeSignedContributions,
  signedContributionsFromContrastiveFeatures,
  summarizeMetricSeries,
  type ContrastiveFeatureSet,
  type HeatmapMatrix,
  type MetricSeries,
  type SignedContribution,
  type SteeringDoseResponse,
  type TokenFeatureMatrix,
} from "./index.js";

const scoreSeries = {
  id: "score",
  label: "Score",
  direction: "up",
  precision: 2,
  points: [
    {
      id: "baseline",
      label: "Baseline",
      value: 0.61,
    },
    {
      id: "exp-a",
      label: "A",
      value: 0.66,
    },
    {
      id: "exp-c",
      label: "A + C",
      value: 0.67,
    },
  ],
} satisfies MetricSeries;

test("summarizes metric direction and delta", () => {
  const summary = summarizeMetricSeries({ series: scoreSeries });

  expect(summary.firstValue).toBe(0.61);
  expect(summary.lastValue).toBe(0.67);
  expect(summary.delta).toBeCloseTo(0.06);
  expect(summary.trend).toBe("improved");
  expect(formatMetricDelta({ summary, precision: 2 })).toBe("+0.06 (+9.84%)");
});

test("normalizes metric values between min and max", () => {
  const points = normalizeMetricSeries({ series: scoreSeries });

  expect(points.map((point) => point.ratio)).toEqual([0, 0.8333333333333334, 1]);
});

test("normalizes buckets against max value", () => {
  const buckets = normalizeBuckets({
    buckets: [
      {
        id: "completed",
        label: "Completed",
        value: 8,
      },
      {
        id: "suspicious",
        label: "Suspicious",
        value: 2,
      },
    ],
  });

  expect(buckets.map((bucket) => bucket.ratio)).toEqual([1, 0.25]);
});

const patchingMatrix = {
  id: "patching",
  label: "Activation patching",
  rows: [
    {
      id: "layer-0",
      label: "L0",
    },
    {
      id: "layer-1",
      label: "L1",
    },
  ],
  columns: [
    {
      id: "token-a",
      label: "A",
    },
    {
      id: "token-b",
      label: "B",
    },
  ],
  cells: [
    {
      id: "l0-a",
      rowId: "layer-0",
      columnId: "token-a",
      value: -0.4,
    },
    {
      id: "l0-b",
      rowId: "layer-0",
      columnId: "token-b",
      value: 0,
    },
    {
      id: "l1-a",
      rowId: "layer-1",
      columnId: "token-a",
      value: 0.8,
    },
  ],
} satisfies HeatmapMatrix;

test("normalizes heatmap cells around zero", () => {
  const matrix = normalizeHeatmapMatrix({ matrix: patchingMatrix });

  expect(heatmapCellFor({ matrix, rowId: "layer-0", columnId: "token-a" })?.ratio).toBe(
    0.25,
  );
  expect(heatmapCellFor({ matrix, rowId: "layer-0", columnId: "token-b" })?.ratio).toBe(
    0.5,
  );
  expect(heatmapCellFor({ matrix, rowId: "layer-1", columnId: "token-a" })?.ratio).toBe(
    1,
  );
});

test("sorts signed contributions by magnitude", () => {
  const contributions = [
    {
      id: "head-1",
      label: "Head 1",
      value: 0.3,
    },
    {
      id: "head-2",
      label: "Head 2",
      value: -0.9,
    },
    {
      id: "head-3",
      label: "Head 3",
      value: 0.1,
    },
  ] satisfies SignedContribution[];

  const normalized = normalizeSignedContributions({
    contributions,
    limit: 2,
  });

  expect(normalized.map((contribution) => contribution.id)).toEqual(["head-2", "head-1"]);
  expect(normalized.map((contribution) => contribution.magnitudeRatio)).toEqual([
    1,
    0.3333333333333333,
  ]);
});

test("converts token-feature activations to heatmap cells", () => {
  const matrix = {
    id: "token-features",
    label: "Token features",
    tokens: [
      {
        id: "tok-0",
        label: "Hello",
      },
      {
        id: "tok-1",
        label: "world",
      },
    ],
    features: [
      {
        id: "feat-1",
        label: "Greeting",
      },
    ],
    activations: [
      {
        id: "feat-1-tok-0",
        featureId: "feat-1",
        tokenId: "tok-0",
        value: 0.72,
      },
    ],
  } satisfies TokenFeatureMatrix;

  const heatmap = heatmapFromTokenFeatureMatrix({ matrix });

  expect(heatmap.rows.map((row) => row.id)).toEqual(["feat-1"]);
  expect(heatmap.columns.map((column) => column.id)).toEqual(["tok-0", "tok-1"]);
  expect(heatmap.cells[0]).toMatchObject({
    rowId: "feat-1",
    columnId: "tok-0",
    value: 0.72,
  });
});

test("converts steering dose response to metric series", () => {
  const response = {
    id: "concise",
    label: "Conciseness steering",
    metricLabel: "Mean response length",
    direction: "down",
    unit: " tokens",
    points: [
      {
        id: "zero",
        label: "0.0",
        strength: 0,
        value: 180,
      },
      {
        id: "half",
        label: "0.5",
        strength: 0.5,
        value: 124,
      },
    ],
  } satisfies SteeringDoseResponse;

  const series = metricSeriesFromSteeringDoseResponse({ response });
  const summary = summarizeMetricSeries({ series });

  expect(series.label).toBe("Mean response length");
  expect(summary.trend).toBe("improved");
  expect(summary.delta).toBe(-56);
});

test("converts contrastive features to signed contributions", () => {
  const featureSet = {
    id: "formal-vs-casual",
    label: "Formal vs casual",
    leftLabel: "formal",
    rightLabel: "casual",
    differences: [
      {
        id: "feature-1",
        label: "Legal boilerplate",
        value: 0.66,
      },
      {
        id: "feature-2",
        label: "Emoji-heavy tone",
        value: -0.42,
      },
    ],
  } satisfies ContrastiveFeatureSet;

  const contributions = signedContributionsFromContrastiveFeatures({ featureSet });

  expect(contributions).toEqual([
    {
      id: "feature-1",
      label: "Legal boilerplate",
      value: 0.66,
      group: undefined,
    },
    {
      id: "feature-2",
      label: "Emoji-heavy tone",
      value: -0.42,
      group: undefined,
    },
  ]);
});
