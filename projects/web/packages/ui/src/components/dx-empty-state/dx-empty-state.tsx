import type { ReactNode } from "react";

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
    <section className="dx-empty-state">
      <h2 className="dx-empty-state__heading">{heading}</h2>
      {description && <p className="dx-empty-state__description">{description}</p>}
      {action && <div className="dx-empty-state__action">{action}</div>}
    </section>
  );
}
