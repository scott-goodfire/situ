import type { ReactNode } from "react";
import { classNames } from "../../class-names";
import * as s from "./dx-card.css";

export type DxCardTone = "default" | "warning" | "danger";
export type DxCardPadding = "none" | "tight" | "default";

const PADDING_CLASS = {
  none: s.paddingNone,
  tight: s.paddingTight,
  default: s.paddingDefault,
} as const;

export function DxCard({
  children,
  tone = "default",
  padding = "default",
  interactive = false,
  className,
}: {
  children: ReactNode;
  tone?: DxCardTone;
  padding?: DxCardPadding;
  interactive?: boolean;
  className?: string;
}) {
  const cardClassName = classNames({
    values: [
      s.card,
      tone === "warning" && s.warning,
      tone === "danger" && s.danger,
      PADDING_CLASS[padding],
      interactive && s.interactive,
      className,
    ],
  });

  return <div className={cardClassName}>{children}</div>;
}
