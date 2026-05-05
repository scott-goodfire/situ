import { expect, test } from "bun:test";
import {
  formatMetricDelta,
  normalizeBuckets,
  normalizeMetricSeries,
  summarizeMetricSeries,
  type MetricSeries,
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
