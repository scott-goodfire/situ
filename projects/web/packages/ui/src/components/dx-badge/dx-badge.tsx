import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";
import * as s from "./dx-badge.css";

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
    values: [
      s.badge,
      tone === "success" && s.success,
      tone === "warning" && s.warning,
      tone === "danger" && s.danger,
      withDot && s.withDot,
    ],
  });

  return (
    <span className={className}>
      {withDot && <span className={s.dot} aria-hidden />}
      {children}
    </span>
  );
}
