import {
  metricSeriesFromSteeringDoseResponse,
  type SteeringDoseResponse as SteeringDoseResponseData,
} from "@situ/chart-model";
import { Box, Text } from "ink";
import { MetricTrend } from "../metric-trend/metric-trend.js";

export function SteeringDoseResponse({
  response,
  width = 20,
}: {
  response: SteeringDoseResponseData;
  width?: number;
}) {
  const series = metricSeriesFromSteeringDoseResponse({ response });

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        {response.label}
      </Text>
      <MetricTrend series={series} width={width} />
    </Box>
  );
}
