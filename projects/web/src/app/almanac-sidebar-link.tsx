import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DxSidebarItem } from "@almanac/web-ui";

export type AlmanacSidebarLinkProps = LinkProps & {
  icon?: ReactNode;
  label: ReactNode;
  badge?: ReactNode;
};

export function AlmanacSidebarLink({
  icon,
  label,
  badge,
  ...linkProps
}: AlmanacSidebarLinkProps) {
  return (
    <DxSidebarItem
      icon={icon}
      label={label}
      badge={badge}
      render={<Link {...linkProps} />}
    />
  );
}
