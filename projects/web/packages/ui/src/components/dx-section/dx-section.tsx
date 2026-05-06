import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";
import * as s from "./dx-section.css";

export function DxSection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const sectionClassName = classNames({ values: [s.section, className] });

  return (
    <section className={sectionClassName}>
      <h2 className={s.title}>{title}</h2>
      {children}
    </section>
  );
}
