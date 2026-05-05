import type { AnchorHTMLAttributes, ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export type DxLinkVariant = "accent" | "muted";

export type DxLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
  children: ReactNode;
  variant?: DxLinkVariant;
  withArrow?: boolean;
  className?: string;
};

export function DxLink({
  children,
  variant = "accent",
  withArrow = false,
  className,
  ...props
}: DxLinkProps) {
  const linkClassName = classNames({
    values: ["dx-link", `dx-link--${variant}`, className],
  });

  return (
    <a {...props} className={linkClassName}>
      <span>{children}</span>
      {withArrow && (
        <span className="dx-link__arrow" aria-hidden>
          →
        </span>
      )}
    </a>
  );
}
