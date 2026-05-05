import lodash from "lodash";

export type ChartTone = "neutral" | "info" | "success" | "warning" | "danger";

export type MetricDirection = "up" | "down" | "neutral";

export type MetricTrendState = "improved" | "regressed" | "flat" | "unknown";

export type MetricPoint = {
  id: string;
  label: string;
  value: number;
  timestamp?: string;
  tone?: ChartTone;
};

export type MetricSeries = {
  id: string;
  label: string;
  points: MetricPoint[];
  direction: MetricDirection;
  unit?: string;
  precision?: number;
};

export type MetricSummary = {
  firstValue: number | undefined;
  lastValue: number | undefined;
  minValue: number | undefined;
  maxValue: number | undefined;
  delta: number | undefined;
  deltaPercent: number | undefined;
  trend: MetricTrendState;
};

export type NormalizedMetricPoint = MetricPoint & {
  ratio: number;
};

export type BucketDatum = {
  id: string;
  label: string;
  value: number;
  tone?: ChartTone;
};

export type NormalizedBucketDatum = BucketDatum & {
  ratio: number;
};

export function summarizeMetricSeries({
  series,
}: {
  series: MetricSeries;
}): MetricSummary {
  const values = metricValues({ points: series.points });
  const firstValue = lodash.first(values);
  const lastValue = lodash.last(values);
  const minValue = minValueFor({ values });
  const maxValue = maxValueFor({ values });

  if (firstValue === undefined || lastValue === undefined) {
    return {
      firstValue,
      lastValue,
      minValue,
      maxValue,
      delta: undefined,
      deltaPercent: undefined,
      trend: "unknown",
    };
  }

  const delta = lastValue - firstValue;
  const deltaPercent = percentChange({
    startValue: firstValue,
    endValue: lastValue,
  });

  return {
    firstValue,
    lastValue,
    minValue,
    maxValue,
    delta,
    deltaPercent,
    trend: trendState({
      delta,
      direction: series.direction,
    }),
  };
}

export function normalizeMetricSeries({
  series,
}: {
  series: MetricSeries;
}): NormalizedMetricPoint[] {
  const values = metricValues({ points: series.points });
  const minValue = minValueFor({ values });
  const maxValue = maxValueFor({ values });

  return series.points.map((point) => ({
    ...point,
    ratio: normalizedRatio({
      value: point.value,
      minValue,
      maxValue,
    }),
  }));
}

export function normalizeBuckets({
  buckets,
}: {
  buckets: BucketDatum[];
}): NormalizedBucketDatum[] {
  const maxValue = maxValueFor({
    values: buckets.map((bucket) => bucket.value),
  });

  return buckets.map((bucket) => ({
    ...bucket,
    ratio: normalizedBucketRatio({
      value: bucket.value,
      maxValue,
    }),
  }));
}

export function formatMetricValue({
  value,
  unit,
  precision = 2,
}: {
  value: number | undefined;
  unit?: string;
  precision?: number;
}): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }

  const formattedValue = value.toLocaleString("en-US", {
    maximumFractionDigits: precision,
    minimumFractionDigits: 0,
  });

  if (!unit) {
    return formattedValue;
  }

  return `${formattedValue}${unit}`;
}

export function formatMetricDelta({
  summary,
  unit,
  precision = 2,
}: {
  summary: MetricSummary;
  unit?: string;
  precision?: number;
}): string {
  if (summary.delta === undefined) {
    return "n/a";
  }

  const sign = summary.delta > 0 ? "+" : "";
  const formattedDelta = formatMetricValue({
    value: summary.delta,
    unit,
    precision,
  });
  const formattedPercent = formatPercent({
    value: summary.deltaPercent,
    precision,
  });

  return `${sign}${formattedDelta} (${formattedPercent})`;
}

export function formatPercent({
  value,
  precision = 1,
}: {
  value: number | undefined;
  precision?: number;
}): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(precision)}%`;
}

export function toneForTrend({
  trend,
}: {
  trend: MetricTrendState;
}): ChartTone {
  if (trend === "improved") {
    return "success";
  }

  if (trend === "regressed") {
    return "danger";
  }

  return "neutral";
}

function metricValues({ points }: { points: MetricPoint[] }): number[] {
  return points
    .map((point) => point.value)
    .filter((value) => Number.isFinite(value));
}

function minValueFor({ values }: { values: number[] }): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return lodash.min(values);
}

function maxValueFor({ values }: { values: number[] }): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return lodash.max(values);
}

function percentChange({
  startValue,
  endValue,
}: {
  startValue: number;
  endValue: number;
}): number | undefined {
  if (startValue === 0) {
    return undefined;
  }

  return ((endValue - startValue) / Math.abs(startValue)) * 100;
}

function trendState({
  delta,
  direction,
}: {
  delta: number;
  direction: MetricDirection;
}): MetricTrendState {
  if (Math.abs(delta) < Number.EPSILON) {
    return "flat";
  }

  if (direction === "neutral") {
    return "unknown";
  }

  const directionSign = direction === "up" ? 1 : -1;
  const movedInGoodDirection = delta * directionSign > 0;

  if (movedInGoodDirection) {
    return "improved";
  }

  return "regressed";
}

function normalizedRatio({
  value,
  minValue,
  maxValue,
}: {
  value: number;
  minValue: number | undefined;
  maxValue: number | undefined;
}): number {
  if (minValue === undefined || maxValue === undefined) {
    return 0.5;
  }

  if (maxValue === minValue) {
    return 0.5;
  }

  return (value - minValue) / (maxValue - minValue);
}

function normalizedBucketRatio({
  value,
  maxValue,
}: {
  value: number;
  maxValue: number | undefined;
}): number {
  if (!maxValue || maxValue <= 0) {
    return 0;
  }

  return value / maxValue;
}
