import {
  cloneElement,
  isValidElement,
  type AnchorHTMLAttributes,
  type AriaAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { classNames } from "../../class-names";
import * as s from "./dx-sidebar.css";

type RenderableProps = HTMLAttributes<HTMLElement> & AriaAttributes & { [key: string]: unknown };

export function DxSidebar({
  header,
  footer,
  children,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.sidebar}>
      {header && <div className={s.header}>{header}</div>}
      <div className={s.body}>{children}</div>
      {footer && <div className={s.footer}>{footer}</div>}
    </div>
  );
}

export function DxSidebarSection({
  title,
  count,
  children,
}: {
  title?: ReactNode;
  count?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.section}>
      {(title || count !== undefined) && (
        <div className={s.sectionHeader}>
          <span className={s.sectionTitle}>{title}</span>
          {count !== undefined && <span className={s.sectionCount}>{count}</span>}
        </div>
      )}
      <div className={s.sectionItems}>{children}</div>
    </div>
  );
}

export type DxSidebarItemProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
  icon?: ReactNode;
  label: ReactNode;
  badge?: ReactNode;
  active?: boolean;
  render?: ReactElement;
  className?: string;
};

export function DxSidebarItem({
  icon,
  label,
  badge,
  active = false,
  render,
  className,
  ...props
}: DxSidebarItemProps) {
  const itemClassName = classNames({
    values: [s.item, active && s.itemActive, className],
  });

  const inner = (
    <>
      {icon && <span className={s.itemIcon}>{icon}</span>}
      <span className={s.itemLabel}>{label}</span>
      {badge !== undefined && badge !== null && (
        <span className={s.itemBadge}>{badge}</span>
      )}
    </>
  );

  if (render && isValidElement(render)) {
    const existingProps = render.props as RenderableProps;
    const renderClassName = classNames({
      values: [itemClassName, existingProps.className],
    });
    return cloneElement(
      render as ReactElement<RenderableProps>,
      {
        ...existingProps,
        className: renderClassName,
        "data-active": active,
        "aria-current": active ? "page" : undefined,
      },
      inner,
    );
  }

  return (
    <a
      {...props}
      className={itemClassName}
      data-active={active}
      aria-current={active ? "page" : undefined}
    >
      {inner}
    </a>
  );
}
