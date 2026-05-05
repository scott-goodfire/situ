import {
  formatMetricDelta,
  formatMetricValue,
  normalizeMetricSeries,
  summarizeMetricSeries,
  toneForTrend,
  type ChartTone,
  type MetricSeries,
} from "@almanac/chart-model";
import { Box, Text } from "ink";

const SPARKLINE_STEPS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export function MetricTrend({
  series,
  width = 18,
  showSummary = true,
}: {
  series: MetricSeries;
  width?: number;
  showSummary?: boolean;
}) {
  const summary = summarizeMetricSeries({ series });
  const tone = toneForTrend({ trend: summary.trend });
  const sparkline = sparklineText({
    series,
    width,
  });

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="cyan" bold>
          {series.label}
        </Text>
        {showSummary && (
          <>
            {" "}
            {formatMetricValue({
              value: summary.firstValue,
              unit: series.unit,
              precision: series.precision,
            })}
            {" -> "}
            {formatMetricValue({
              value: summary.lastValue,
              unit: series.unit,
              precision: series.precision,
            })}
            {" "}
            <Text color={inkColorForTone({ tone })}>
              {formatMetricDelta({
                summary,
                unit: series.unit,
                precision: series.precision,
              })}
            </Text>
          </>
        )}
      </Text>
      <Text color={inkColorForTone({ tone })}>{sparkline}</Text>
    </Box>
  );
}

function sparklineText({
  series,
  width,
}: {
  series: MetricSeries;
  width: number;
}): string {
  const points = normalizeMetricSeries({ series });

  if (points.length === 0) {
    return "n/a";
  }

  return sampledRatios({
    ratios: points.map((point) => point.ratio),
    width,
  })
    .map((ratio) => sparklineStep({ ratio }))
    .join("");
}

function sampledRatios({
  ratios,
  width,
}: {
  ratios: number[];
  width: number;
}): number[] {
  if (ratios.length <= width) {
    return ratios;
  }

  const lastIndex = ratios.length - 1;
  const sampleCount = Math.max(width, 1);

  return Array.from({ length: sampleCount }, (_item, index) => {
    const ratioIndex = Math.round((index / (sampleCount - 1)) * lastIndex);

    return ratios[ratioIndex] ?? 0.5;
  });
}

function sparklineStep({ ratio }: { ratio: number }): string {
  const maxIndex = SPARKLINE_STEPS.length - 1;
  const stepIndex = Math.max(0, Math.min(maxIndex, Math.round(ratio * maxIndex)));

  return SPARKLINE_STEPS[stepIndex] ?? "▁";
}

function inkColorForTone({
  tone,
}: {
  tone: ChartTone;
}): "cyan" | "green" | "yellow" | "red" | "gray" {
  if (tone === "success") {
    return "green";
  }

  if (tone === "warning") {
    return "yellow";
  }

  if (tone === "danger") {
    return "red";
  }

  if (tone === "info") {
    return "cyan";
  }

  return "gray";
}
