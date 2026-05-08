import type { ReactNode } from "react";
import * as s from "./dx-stat-block.css";

export function DxStatBlock({
  value,
  caption,
  detail,
}: {
  value: ReactNode;
  caption?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className={s.block}>
      <div className={s.value}>{value}</div>
      {caption && <div className={s.caption}>{caption}</div>}
      {detail && <div className={s.detail}>{detail}</div>}
    </div>
  );
}
