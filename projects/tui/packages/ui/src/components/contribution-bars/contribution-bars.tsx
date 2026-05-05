import {
  formatMetricValue,
  normalizeSignedContributions,
  toneForSignedValue,
  type ChartTone,
  type SignedContribution,
} from "@almanac/chart-model";
import { Box, Text } from "ink";

export function ContributionBars({
  contributions,
  limit = 8,
  width = 18,
  precision = 2,
}: {
  contributions: SignedContribution[];
  limit?: number;
  width?: number;
  precision?: number;
}) {
  const normalizedContributions = normalizeSignedContributions({
    contributions,
    limit,
  });

  return (
    <Box flexDirection="column">
      {normalizedContributions.length === 0 && <Text dimColor>No contributions yet</Text>}
      {normalizedContributions.map((contribution) => {
        const tone = toneForSignedValue({
          value: contribution.value,
        });

        return (
          <Text key={contribution.id}>
            <Text color={inkColorForTone({ tone })}>
              {barText({
                ratio: contribution.magnitudeRatio,
                width,
              })}
            </Text>
            {" "}
            {contribution.label}
            {" "}
            <Text dimColor>
              {formatMetricValue({
                value: contribution.value,
                precision,
              })}
            </Text>
          </Text>
        );
      })}
    </Box>
  );
}

function barText({
  ratio,
  width,
}: {
  ratio: number;
  width: number;
}): string {
  const filledWidth = Math.round(Math.max(0, Math.min(1, ratio)) * width);
  const emptyWidth = Math.max(width - filledWidth, 0);

  return `${"█".repeat(filledWidth)}${"░".repeat(emptyWidth)}`;
}

function inkColorForTone({
  tone,
}: {
  tone: ChartTone;
}): "green" | "red" | "gray" {
  if (tone === "success") {
    return "green";
  }

  if (tone === "danger") {
    return "red";
  }

  return "gray";
}
