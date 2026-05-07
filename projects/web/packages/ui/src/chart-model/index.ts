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

export type HeatmapCell = {
  id: string;
  rowId: string;
  columnId: string;
  value: number;
  label?: string;
};

export type HeatmapRow = {
  id: string;
  label: string;
};

export type HeatmapColumn = {
  id: string;
  label: string;
};

export type HeatmapMatrix = {
  id: string;
  label: string;
  rows: HeatmapRow[];
  columns: HeatmapColumn[];
  cells: HeatmapCell[];
  valueLabel?: string;
};

export type NormalizedHeatmapCell = HeatmapCell & {
  ratio: number;
  signedRatio: number;
};

export type NormalizedHeatmapMatrix = HeatmapMatrix & {
  cells: NormalizedHeatmapCell[];
};

export type SignedContribution = {
  id: string;
  label: string;
  value: number;
  group?: string;
};

export type NormalizedSignedContribution = SignedContribution & {
  magnitudeRatio: number;
};

export type TokenFeatureToken = {
  id: string;
  label: string;
  position?: number;
};

export type TokenFeature = {
  id: string;
  label: string;
  group?: string;
};

export type TokenFeatureActivation = {
  id: string;
  tokenId: string;
  featureId: string;
  value: number;
  label?: string;
};

export type TokenFeatureMatrix = {
  id: string;
  label: string;
  tokens: TokenFeatureToken[];
  features: TokenFeature[];
  activations: TokenFeatureActivation[];
  valueLabel?: string;
};

export type SteeringDosePoint = {
  id: string;
  label: string;
  strength: number;
  value: number;
  tone?: ChartTone;
};

export type SteeringDoseResponse = {
  id: string;
  label: string;
  metricLabel: string;
  direction: MetricDirection;
  points: SteeringDosePoint[];
  unit?: string;
  precision?: number;
};

export type ContrastiveFeatureDifference = {
  id: string;
  label: string;
  value: number;
  featureId?: string;
  group?: string;
};

export type ContrastiveFeatureSet = {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  differences: ContrastiveFeatureDifference[];
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

export function normalizeHeatmapMatrix({
  matrix,
}: {
  matrix: HeatmapMatrix;
}): NormalizedHeatmapMatrix {
  const maxMagnitude = maxMagnitudeFor({
    values: matrix.cells.map((cell) => cell.value),
  });

  return {
    ...matrix,
    cells: matrix.cells.map((cell) => ({
      ...cell,
      ratio: normalizedHeatmapRatio({
        value: cell.value,
        maxMagnitude,
      }),
      signedRatio: normalizedSignedRatio({
        value: cell.value,
        maxMagnitude,
      }),
    })),
  };
}

export function heatmapCellFor({
  matrix,
  rowId,
  columnId,
}: {
  matrix: NormalizedHeatmapMatrix;
  rowId: string;
  columnId: string;
}): NormalizedHeatmapCell | undefined {
  return lodash.find(
    matrix.cells,
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  );
}

export function normalizeSignedContributions({
  contributions,
  limit,
}: {
  contributions: SignedContribution[];
  limit?: number;
}): NormalizedSignedContribution[] {
  const sortedContributions = lodash.orderBy(
    contributions,
    [(contribution) => Math.abs(contribution.value)],
    ["desc"],
  );
  const visibleContributions = limit
    ? sortedContributions.slice(0, limit)
    : sortedContributions;
  const maxMagnitude = maxMagnitudeFor({
    values: visibleContributions.map((contribution) => contribution.value),
  });

  return visibleContributions.map((contribution) => ({
    ...contribution,
    magnitudeRatio: normalizedMagnitudeRatio({
      value: contribution.value,
      maxMagnitude,
    }),
  }));
}

export function heatmapFromTokenFeatureMatrix({
  matrix,
}: {
  matrix: TokenFeatureMatrix;
}): HeatmapMatrix {
  return {
    id: matrix.id,
    label: matrix.label,
    valueLabel: matrix.valueLabel,
    rows: matrix.features.map((feature) => ({
      id: feature.id,
      label: feature.label,
    })),
    columns: matrix.tokens.map((token) => ({
      id: token.id,
      label: token.label,
    })),
    cells: matrix.activations.map((activation) => ({
      id: activation.id,
      rowId: activation.featureId,
      columnId: activation.tokenId,
      value: activation.value,
      label: activation.label,
    })),
  };
}

export function metricSeriesFromSteeringDoseResponse({
  response,
}: {
  response: SteeringDoseResponse;
}): MetricSeries {
  return {
    id: response.id,
    label: response.metricLabel,
    direction: response.direction,
    unit: response.unit,
    precision: response.precision,
    points: response.points.map((point) => ({
      id: point.id,
      label: point.label,
      value: point.value,
      tone: point.tone,
    })),
  };
}

export function signedContributionsFromContrastiveFeatures({
  featureSet,
}: {
  featureSet: ContrastiveFeatureSet;
}): SignedContribution[] {
  return featureSet.differences.map((difference) => ({
    id: difference.id,
    label: difference.label,
    value: difference.value,
    group: difference.group,
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

export function toneForSignedValue({
  value,
}: {
  value: number;
}): ChartTone {
  if (value > 0) {
    return "success";
  }

  if (value < 0) {
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

function maxMagnitudeFor({ values }: { values: number[] }): number | undefined {
  const magnitudes = values
    .map((value) => Math.abs(value))
    .filter((value) => Number.isFinite(value));

  return maxValueFor({ values: magnitudes });
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

function normalizedHeatmapRatio({
  value,
  maxMagnitude,
}: {
  value: number;
  maxMagnitude: number | undefined;
}): number {
  if (!maxMagnitude || maxMagnitude <= 0) {
    return 0.5;
  }

  return (value + maxMagnitude) / (maxMagnitude * 2);
}

function normalizedSignedRatio({
  value,
  maxMagnitude,
}: {
  value: number;
  maxMagnitude: number | undefined;
}): number {
  if (!maxMagnitude || maxMagnitude <= 0) {
    return 0;
  }

  return value / maxMagnitude;
}

function normalizedMagnitudeRatio({
  value,
  maxMagnitude,
}: {
  value: number;
  maxMagnitude: number | undefined;
}): number {
  if (!maxMagnitude || maxMagnitude <= 0) {
    return 0;
  }

  return Math.abs(value) / maxMagnitude;
}
