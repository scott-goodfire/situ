import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const positioner = style({ zIndex: 10 });

export const popup = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 12px",
  maxWidth: 320,
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.panel,
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  boxShadow: vars.shadow.window,
  outline: "none",
});
