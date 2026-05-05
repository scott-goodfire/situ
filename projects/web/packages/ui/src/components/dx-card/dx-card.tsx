import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export type DxCardTone = "default" | "warning" | "danger";
export type DxCardPadding = "none" | "tight" | "default";

export function DxCard({
  children,
  tone = "default",
  padding = "default",
  className,
}: {
  children: ReactNode;
  tone?: DxCardTone;
  padding?: DxCardPadding;
  className?: string;
}) {
  const cardClassName = classNames({
    values: ["dx-card", `dx-card--${tone}`, `dx-card--padding-${padding}`, className],
  });

  return <div className={cardClassName}>{children}</div>;
}
