import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DxSidebarItem } from "@situ/web-ui";

export type SituSidebarLinkProps = LinkProps & {
  icon?: ReactNode;
  label: ReactNode;
  badge?: ReactNode;
};

export function SituSidebarLink({
  icon,
  label,
  badge,
  ...linkProps
}: SituSidebarLinkProps) {
  return (
    <DxSidebarItem
      icon={icon}
      label={label}
      badge={badge}
      render={<Link {...linkProps} />}
    />
  );
}
