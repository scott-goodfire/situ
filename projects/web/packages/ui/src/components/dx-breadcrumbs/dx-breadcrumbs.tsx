import type { ReactNode } from "react";

export type DxBreadcrumb = {
  id: string;
  label: ReactNode;
  href?: string;
};

export function DxBreadcrumbs({ items }: { items: DxBreadcrumb[] }) {
  return (
    <nav className="dx-breadcrumbs" aria-label="Breadcrumb">
      <ol className="dx-breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.id} className="dx-breadcrumbs__item">
              {item.href && !isLast ? (
                <a className="dx-breadcrumbs__link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span className="dx-breadcrumbs__current" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="dx-breadcrumbs__separator" aria-hidden>
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
