import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export type DxNoticeTone = "info" | "warning" | "danger";

export function DxNotice({
  tone = "info",
  children,
}: {
  tone?: DxNoticeTone;
  children: ReactNode;
}) {
  const className = classNames({
    values: ["dx-notice", `dx-notice--${tone}`],
  });

  return <div className={className}>{children}</div>;
}
