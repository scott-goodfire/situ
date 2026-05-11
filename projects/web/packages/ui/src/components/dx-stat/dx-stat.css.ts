import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const stat = style({
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
});

export const neutral = style({ color: vars.color.mutedForeground });
export const added = style({ color: vars.color.successStrong });
export const removed = style({ color: vars.color.dangerStrong });
