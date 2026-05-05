import {
  cloneElement,
  isValidElement,
  type AnchorHTMLAttributes,
  type AriaAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { classNames } from "../../utils/class-names";

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
    <div className="dx-sidebar">
      {header && <div className="dx-sidebar__header">{header}</div>}
      <div className="dx-sidebar__body">{children}</div>
      {footer && <div className="dx-sidebar__footer">{footer}</div>}
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
    <div className="dx-sidebar-section">
      {(title || count !== undefined) && (
        <div className="dx-sidebar-section__header">
          <span className="dx-sidebar-section__title">{title}</span>
          {count !== undefined && <span className="dx-sidebar-section__count">{count}</span>}
        </div>
      )}
      <div className="dx-sidebar-section__items">{children}</div>
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
    values: ["dx-sidebar-item", active && "dx-sidebar-item--active", className],
  });

  const inner = (
    <>
      {icon && <span className="dx-sidebar-item__icon">{icon}</span>}
      <span className="dx-sidebar-item__label">{label}</span>
      {badge !== undefined && badge !== null && (
        <span className="dx-sidebar-item__badge">{badge}</span>
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
