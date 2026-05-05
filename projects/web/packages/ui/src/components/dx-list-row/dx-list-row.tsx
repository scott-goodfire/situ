import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export function DxListRow({
  icon,
  title,
  status,
  meta,
  active = false,
  onClick,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  meta?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const rowClassName = classNames({
    values: ["dx-list-row", active && "dx-list-row--active", className],
  });

  return (
    <button type="button" className={rowClassName} onClick={onClick} data-active={active}>
      {icon && <span className="dx-list-row__icon">{icon}</span>}
      <span className="dx-list-row__content">
        <span className="dx-list-row__title">{title}</span>
        {status && <span className="dx-list-row__status">{status}</span>}
      </span>
      {meta && <span className="dx-list-row__meta">{meta}</span>}
    </button>
  );
}
