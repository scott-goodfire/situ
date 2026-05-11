import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const positioner = style({ zIndex: 10 });

export const popup = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 160,
  padding: 4,
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.panel,
  boxShadow: vars.shadow.window,
  outline: "none",
});

export const item = style({
  all: "unset",
  display: "flex",
  alignItems: "center",
  padding: "6px 8px",
  borderRadius: vars.radius.sm,
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  cursor: "pointer",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": { background: vars.color.fg05 },
  selectors: {
    "&[data-highlighted]": { background: vars.color.fg05 },
    "&[data-disabled]": {
      color: vars.color.mutedForegroundTertiary,
      cursor: "not-allowed",
    },
  },
});
