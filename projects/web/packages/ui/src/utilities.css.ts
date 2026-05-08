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

export const chartToneSuccess = style({ color: vars.color.successStrong });
export const chartToneWarning = style({ color: vars.color.warningStrong });
export const chartToneDanger = style({ color: vars.color.dangerStrong });
export const chartToneInfo = style({ color: vars.color.accent });
export const chartToneNeutral = style({ color: vars.color.mutedForeground });
