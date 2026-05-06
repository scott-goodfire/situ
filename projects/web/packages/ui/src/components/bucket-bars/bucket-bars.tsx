import {
  type BucketDatum,
  type ChartTone,
} from "@situ/chart-model";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { classNames } from "../../class-names";
import { vars } from "../../theme.css";
import { muted } from "../../utilities.css";
import * as s from "./bucket-bars.css";

export function BucketBars({
  buckets,
  className,
}: {
  buckets: BucketDatum[];
  className?: string;
}) {
  const rootClassName = classNames({ values: [s.root, className] });
  const chartHeight = Math.max(buckets.length * 36, 96);

  if (buckets.length === 0) {
    return <p className={muted}>No buckets yet</p>;
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
            tick={{ fill: vars.color.mutedForegroundTertiary, fontSize: 13 }}
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
