import type { MetricSeries } from "@situ/chart-model";
import { MetricTrend } from "./metric-trend.js";
import type { TuiStory } from "../../stories/story-types.js";

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
      id: "a",
      label: "A",
      value: 0.64,
    },
    {
      id: "c",
      label: "C",
      value: 0.62,
    },
    {
      id: "a-c",
      label: "A + C",
      value: 0.68,
    },
  ],
} satisfies MetricSeries;

const latencySeries = {
  id: "latency",
  label: "Latency",
  direction: "down",
  unit: "ms",
  precision: 0,
  points: [
    {
      id: "baseline",
      label: "Baseline",
      value: 1830,
    },
    {
      id: "a",
      label: "A",
      value: 1910,
    },
    {
      id: "c",
      label: "C",
      value: 1875,
    },
    {
      id: "a-c",
      label: "A + C",
      value: 1760,
    },
  ],
} satisfies MetricSeries;

export const stories = [
  {
    id: "metric-trend/score",
    title: "Metric Trend",
    name: "score",
    render: () => <MetricTrend series={scoreSeries} />,
  },
  {
    id: "metric-trend/latency",
    title: "Metric Trend",
    name: "latency",
    render: () => <MetricTrend series={latencySeries} />,
  },
] satisfies TuiStory[];
