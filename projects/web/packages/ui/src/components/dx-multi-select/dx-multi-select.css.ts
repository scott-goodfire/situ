import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const positioner = style({ zIndex: 100 });

export const popup = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 180,
  padding: 4,
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.panel,
  color: vars.color.foreground,
  boxShadow: vars.shadow.window,
  outline: "none",
});

const itemBase = {
  all: "unset",
  display: "grid",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: vars.radius.sm,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  cursor: "pointer",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}, color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": { background: vars.color.fg05 },
  selectors: {
    "&[data-highlighted]": { background: vars.color.fg05 },
    "&[data-checked]": { color: vars.color.foreground },
    "&[data-disabled]": {
      color: vars.color.mutedForegroundTertiary,
      cursor: "not-allowed",
    },
  },
} as const;

export const item = style({
  ...itemBase,
  gridTemplateColumns: "14px minmax(0, 1fr)",
});

export const itemCompact = style({
  ...itemBase,
  gridTemplateColumns: "minmax(0, 1fr)",
});

export const indicator = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 14,
  height: 14,
  color: vars.color.foreground,
});

export const label = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
