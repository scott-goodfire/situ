import type { ReactNode } from "react";
import { classNames } from "../../class-names";
import * as s from "./dx-list-row.css";

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
  const rowClassName = classNames({ values: [s.row, className] });

  return (
    <button type="button" className={rowClassName} onClick={onClick} data-active={active}>
      {icon && <span className={s.icon}>{icon}</span>}
      <span className={s.content}>
        <span className={s.title}>{title}</span>
        {status && <span className={s.status}>{status}</span>}
      </span>
      {meta && <span className={s.meta}>{meta}</span>}
    </button>
  );
}
