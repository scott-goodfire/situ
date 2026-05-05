import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export type DxBadgeTone = "neutral" | "success" | "warning" | "danger";

export function DxBadge({
  tone = "neutral",
  children,
}: {
  tone?: DxBadgeTone;
  children: ReactNode;
}) {
  const className = classNames({
    values: ["dx-badge", `dx-badge--${tone}`],
  });

  return <span className={className}>{children}</span>;
}
