import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const toastClass = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "10px 12px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.panel,
  color: vars.color.foreground,
  fontFamily: vars.font.sans,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  boxShadow: vars.shadow.window,
});

export const title = style({
  color: vars.color.foreground,
  fontWeight: 500,
});

export const description = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
});

export const action = style({
  border: 0,
  background: "transparent",
  color: vars.color.accent,
  fontSize: vars.text.productBase,
  fontWeight: 500,
  cursor: "pointer",
});

export const close = style({
  border: 0,
  background: "transparent",
  color: vars.color.mutedForeground,
  cursor: "pointer",
});
