import {
  formatMetricValue,
  normalizeSignedContributions,
  toneForSignedValue,
  type ChartTone,
  type SignedContribution,
} from "@almanac/chart-model";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { classNames } from "../../utils/class-names";

export function ContributionBars({
  contributions,
  limit = 8,
  className,
}: {
  contributions: SignedContribution[];
  limit?: number;
  className?: string;
}) {
  const normalizedContributions = normalizeSignedContributions({
    contributions,
    limit,
  });
  const rootClassName = classNames({
    values: ["dx-contribution-bars", className],
  });
  const chartHeight = Math.max(normalizedContributions.length * 34, 96);

  if (normalizedContributions.length === 0) {
    return <p className="dx-muted">No contributions yet</p>;
  }

  return (
    <div className={rootClassName} style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={normalizedContributions}
          layout="vertical"
          margin={{
            top: 4,
            right: 24,
            bottom: 4,
            left: 16,
          }}
        >
          <XAxis type="number" hide domain={[0, 1]} />
          <YAxis
            dataKey="label"
            type="category"
            width={120}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--dx-color-subtle)", fontSize: 13 }}
          />
          <Tooltip
            formatter={(_value, _name, item) =>
              formatMetricValue({
                value: item.payload.value,
                precision: 3,
              })
            }
          />
          <Bar dataKey="magnitudeRatio" radius={[0, 5, 5, 0]} isAnimationActive={false}>
            {normalizedContributions.map((contribution) => (
              <Cell
                key={contribution.id}
                fill={fillForTone({
                  tone: toneForSignedValue({
                    value: contribution.value,
                  }),
                })}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function fillForTone({ tone }: { tone: ChartTone }): string {
  if (tone === "success") {
    return "var(--dx-color-success)";
  }

  if (tone === "danger") {
    return "var(--dx-color-danger)";
  }

  return "var(--dx-color-subtle)";
}
