import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";
import * as s from "./dx-stat.css";

export type DxStatTone = "neutral" | "added" | "removed";

const TONE_CLASS = { neutral: s.neutral, added: s.added, removed: s.removed } as const;

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
    <span className={classNames({ values: [s.stat, TONE_CLASS[tone], className] })}>
      {children}
    </span>
  );
}
