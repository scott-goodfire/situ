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
import { classNames } from "../../utils/class-names";

export function MetricTrend({
  series,
  showSummary = true,
  className,
}: {
  series: MetricSeries;
  showSummary?: boolean;
  className?: string;
}) {
  const summary = summarizeMetricSeries({ series });
  const tone = toneForTrend({ trend: summary.trend });
  const chartData = series.points.map((point) => ({
    id: point.id,
    label: point.label,
    value: point.value,
  }));
  const rootClassName = classNames({
    values: ["dx-metric-trend", className],
  });

  return (
    <div className={rootClassName}>
      <div className="dx-metric-trend__header">
        <div>
          <div className="dx-metric-trend__label">{series.label}</div>
          {showSummary && (
            <div className="dx-metric-trend__summary">
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
            </div>
          )}
        </div>
        {showSummary && (
          <div className={toneClassName({ tone })}>
            {formatMetricDelta({
              summary,
              unit: series.unit,
              precision: series.precision,
            })}
          </div>
        )}
      </div>

      <div className="dx-metric-trend__chart">
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
            <CartesianGrid stroke="var(--dx-color-border-soft)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={{ fill: "var(--dx-color-muted)", fontSize: 12 }}
            />
            <YAxis
              width={42}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--dx-color-muted)", fontSize: 12 }}
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

function toneClassName({ tone }: { tone: ChartTone }): string {
  return classNames({
    values: ["dx-metric-trend__delta", `dx-chart-tone-${tone}`],
  });
}

function strokeForTone({ tone }: { tone: ChartTone }): string {
  if (tone === "success") {
    return "var(--dx-color-success)";
  }

  if (tone === "warning") {
    return "var(--dx-color-warning)";
  }

  if (tone === "danger") {
    return "var(--dx-color-danger)";
  }

  if (tone === "info") {
    return "var(--dx-color-focus)";
  }

  return "var(--dx-color-subtle)";
}
