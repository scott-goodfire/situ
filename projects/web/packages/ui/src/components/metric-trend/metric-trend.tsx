import {
  formatMetricDelta,
  formatMetricValue,
  summarizeMetricSeries,
  toneForTrend,
  type ChartTone,
  type MetricSeries,
} from "@situ/chart-model";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { classNames } from "../../class-names";
import { vars } from "../../theme.css";
import {
  chartToneDanger,
  chartToneInfo,
  chartToneNeutral,
  chartToneSuccess,
  chartToneWarning,
} from "../../utilities.css";
import * as s from "./metric-trend.css";

const TONE_CLASS = {
  success: chartToneSuccess,
  warning: chartToneWarning,
  danger: chartToneDanger,
  info: chartToneInfo,
  neutral: chartToneNeutral,
} as const;

export function MetricTrend({
  series,
  showSummary = true,
  className,
}: {
  series: MetricSeries;
  showSummary?: boolean;
  className?: string;
}) {
  const summaryData = summarizeMetricSeries({ series });
  const tone = toneForTrend({ trend: summaryData.trend });
  const chartData = series.points.map((point) => ({
    id: point.id,
    label: point.label,
    value: point.value,
  }));
  const rootClassName = classNames({ values: [s.root, className] });

  return (
    <div className={rootClassName}>
      <div className={s.header}>
        <div>
          <div className={s.label}>{series.label}</div>
          {showSummary && (
            <div className={s.summary}>
              {formatMetricValue({
                value: summaryData.firstValue,
                unit: series.unit,
                precision: series.precision,
              })}
              {" -> "}
              {formatMetricValue({
                value: summaryData.lastValue,
                unit: series.unit,
                precision: series.precision,
              })}
            </div>
          )}
        </div>
        {showSummary && (
          <div className={classNames({ values: [s.delta, TONE_CLASS[tone]] })}>
            {formatMetricDelta({
              summary: summaryData,
              unit: series.unit,
              precision: series.precision,
            })}
          </div>
        )}
      </div>

      <div className={s.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 8,
              right: 10,
              bottom: 0,
              left: 0,
            }}
          >
            <CartesianGrid stroke={vars.color.border01_5} vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={{ fill: vars.color.mutedForeground, fontSize: 12 }}
            />
            <YAxis
              width={42}
              tickLine={false}
              axisLine={false}
              tick={{ fill: vars.color.mutedForeground, fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) =>
                formatMetricValue({
                  value: Number(value),
                  unit: series.unit,
                  precision: series.precision,
                })
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              dot
              stroke={strokeForTone({ tone })}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function strokeForTone({ tone }: { tone: ChartTone }): string {
  if (tone === "success") {
    return vars.color.successStrong;
  }

  if (tone === "warning") {
    return vars.color.warningStrong;
  }

  if (tone === "danger") {
    return vars.color.dangerStrong;
  }

  if (tone === "info") {
    return vars.color.accent;
  }

  return vars.color.mutedForegroundTertiary;
}
