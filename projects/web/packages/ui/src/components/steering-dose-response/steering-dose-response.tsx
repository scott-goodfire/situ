import {
  metricSeriesFromSteeringDoseResponse,
  type SteeringDoseResponse as SteeringDoseResponseData,
} from "@situ/chart-model";
import { classNames } from "../../class-names";
import { MetricTrend } from "../metric-trend/metric-trend";
import * as s from "./steering-dose-response.css";

export function SteeringDoseResponse({
  response,
  className,
}: {
  response: SteeringDoseResponseData;
  className?: string;
}) {
  const series = metricSeriesFromSteeringDoseResponse({ response });
  const rootClassName = classNames({ values: [s.root, className] });

  return (
    <div className={rootClassName}>
      <div className={s.title}>{response.label}</div>
      <MetricTrend series={series} />
    </div>
  );
}
