import {
  normalizeBuckets,
  type BucketDatum,
  type ChartTone,
} from "@situ/chart-model";
import { Box, Text } from "ink";

export function BucketBars({
  buckets,
  width = 24,
  showValues = true,
}: {
  buckets: BucketDatum[];
  width?: number;
  showValues?: boolean;
}) {
  const normalizedBuckets = normalizeBuckets({ buckets });

  return (
    <Box flexDirection="column">
      {normalizedBuckets.length === 0 && <Text dimColor>No buckets yet</Text>}
      {normalizedBuckets.map((bucket) => (
        <Text key={bucket.id}>
          <Text color={inkColorForTone({ tone: bucket.tone ?? "neutral" })}>
            {barText({
              ratio: bucket.ratio,
              width,
            })}
          </Text>
          {" "}
          {bucket.label}
          {showValues && <Text dimColor>{` ${bucket.value}`}</Text>}
        </Text>
      ))}
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
