import {
  metricSeriesFromSteeringDoseResponse,
  type SteeringDoseResponse as SteeringDoseResponseData,
} from "@almanac/chart-model";
import { classNames } from "../../utils/class-names";
import { MetricTrend } from "../metric-trend/metric-trend";

export function SteeringDoseResponse({
  response,
  className,
}: {
  response: SteeringDoseResponseData;
  className?: string;
}) {
  const series = metricSeriesFromSteeringDoseResponse({ response });
  const rootClassName = classNames({
    values: ["dx-steering-dose-response", className],
  });

  return (
    <div className={rootClassName}>
      <div className="dx-steering-dose-response__title">{response.label}</div>
      <MetricTrend series={series} />
    </div>
  );
}
