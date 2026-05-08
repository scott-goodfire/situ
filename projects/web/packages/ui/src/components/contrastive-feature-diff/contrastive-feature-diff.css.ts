import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const root = style({
  display: "grid",
  gap: 10,
});

export const header = style({
  display: "grid",
  gap: 2,
});

export const title = style({
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
});

export const legend = style({
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
});
