import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const sidebarHeader = style({
  display: "grid",
  gap: 2,
});

export const sidebarBrand = style({
  fontSize: 13,
  fontWeight: 500,
  color: vars.color.foreground,
});

export const sidebarWorkspace = style({
  fontSize: 11,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
});

export const sidebarWorkspaceLink = style({
  display: "block",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  borderRadius: vars.radius.sm,
  textDecoration: "none",
  transition: `color ${vars.duration.fast} ${vars.ease.out}, background-color ${vars.duration.fast} ${vars.ease.out}`,
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
      background: vars.color.fg05,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.ring}`,
      outlineOffset: 2,
    },
  },
});

export const sidebarFooter = style({
  fontSize: 11,
  color: vars.color.mutedForegroundTertiary,
});

export const sidebarFooterRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

export const sidebarFooterVersion = style({
  fontSize: 11,
  color: vars.color.mutedForegroundTertiary,
});

export const topBarActions = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});
