import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const root = style({
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const list = style({
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 4,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const item = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  minWidth: 0,
});

export const link = style({
  color: vars.color.mutedForeground,
  textDecoration: "none",
  transition: `color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": { color: vars.color.foreground },
});

export const current = style({
  color: vars.color.foreground,
  fontWeight: 500,
});

export const separator = style({
  color: vars.color.mutedForegroundTertiary,
});
