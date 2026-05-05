import type { ReactNode } from "react";

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
    <div className="dx-stat-block">
      <div className="dx-stat-block__value">{value}</div>
      {caption && <div className="dx-stat-block__caption">{caption}</div>}
      {detail && <div className="dx-stat-block__detail">{detail}</div>}
    </div>
  );
}
