import type { AnchorHTMLAttributes, ReactNode } from "react";
import { classNames } from "../../utils/class-names";
import * as s from "./dx-link.css";

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
    values: [s.link, variant === "muted" ? s.muted : s.accent, className],
  });

  return (
    <a {...props} className={linkClassName}>
      <span>{children}</span>
      {withArrow && (
        <span className={s.arrow} aria-hidden>
          →
        </span>
      )}
    </a>
  );
}
