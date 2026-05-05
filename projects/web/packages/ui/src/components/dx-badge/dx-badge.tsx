import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export type DxBadgeTone = "neutral" | "success" | "warning" | "danger";

export function DxBadge({
  tone = "neutral",
  withDot = false,
  children,
}: {
  tone?: DxBadgeTone;
  withDot?: boolean;
  children: ReactNode;
}) {
  const className = classNames({
    values: ["dx-badge", `dx-badge--${tone}`, withDot && "dx-badge--with-dot"],
  });

  return (
    <span className={className}>
      {withDot && <span className="dx-badge__dot" aria-hidden />}
      {children}
    </span>
  );
}
