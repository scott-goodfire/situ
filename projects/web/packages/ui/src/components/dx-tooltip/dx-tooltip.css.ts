import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const positioner = style({ zIndex: 20 });

export const popup = style({
  padding: "4px 8px",
  borderRadius: vars.radius.sm,
  background: vars.color.foreground,
  color: vars.color.background,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  lineHeight: 1.3,
  maxWidth: 240,
  pointerEvents: "none",
});
