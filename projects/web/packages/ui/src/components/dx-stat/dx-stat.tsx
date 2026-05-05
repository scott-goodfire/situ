import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export type DxStatTone = "neutral" | "added" | "removed";

export function DxStat({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: DxStatTone;
  className?: string;
}) {
  return (
    <span
      className={classNames({
        values: ["dx-stat", `dx-stat--${tone}`, className],
      })}
    >
      {children}
    </span>
  );
}
