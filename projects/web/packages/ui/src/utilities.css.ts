import { style } from "@vanilla-extract/css";
import { vars } from "./theme.css";

export const muted = style({
  color: vars.color.mutedForeground,
});

export const mono = style({
  fontFamily: vars.font.mono,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});
