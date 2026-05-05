import {
  type BucketDatum,
  type ChartTone,
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

export function BucketBars({
  buckets,
  className,
}: {
  buckets: BucketDatum[];
  className?: string;
}) {
  const rootClassName = classNames({
    values: ["dx-bucket-bars", className],
  });
  const chartHeight = Math.max(buckets.length * 36, 96);

  if (buckets.length === 0) {
    return <p className="dx-muted">No buckets yet</p>;
  }

  return (
    <div className={rootClassName} style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={buckets}
          layout="vertical"
          margin={{
            top: 4,
            right: 12,
            bottom: 4,
            left: 12,
          }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="label"
            type="category"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--dx-color-subtle)", fontSize: 13 }}
          />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 5, 5, 0]} isAnimationActive={false}>
            {buckets.map((bucket) => (
              <Cell
                key={bucket.id}
                fill={fillForTone({ tone: bucket.tone ?? "neutral" })}
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
