import type { ReactNode } from "react";
import * as s from "./dx-empty-state.css";

export function DxEmptyState({
  heading,
  description,
  action,
}: {
  heading: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={s.root}>
      <h2 className={s.heading}>{heading}</h2>
      {description && <p className={s.description}>{description}</p>}
      {action && <div className={s.action}>{action}</div>}
    </section>
  );
}
