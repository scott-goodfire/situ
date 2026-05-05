import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export function DxSection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const sectionClassName = classNames({
    values: ["dx-section", className],
  });

  return (
    <section className={sectionClassName}>
      <h2 className="dx-section__title">{title}</h2>
      {children}
    </section>
  );
}
