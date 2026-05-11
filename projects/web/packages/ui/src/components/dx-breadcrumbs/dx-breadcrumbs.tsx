import type { ReactNode } from "react";
import * as s from "./dx-breadcrumbs.css";

export type DxBreadcrumb = {
  id: string;
  label: ReactNode;
  href?: string;
};

export function DxBreadcrumbs({ items }: { items: DxBreadcrumb[] }) {
  return (
    <nav className={s.root} aria-label="Breadcrumb">
      <ol className={s.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.id} className={s.item}>
              {item.href && !isLast ? (
                <a className={s.link} href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span className={s.current} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className={s.separator} aria-hidden>
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
