import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const arrow = style({
  transition: `transform ${vars.duration.fast} ${vars.ease.out}`,
});

export const link = style({
  display: "inline-flex",
  alignItems: "baseline",
  gap: 4,
  fontSize: vars.text.productLg,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  textDecoration: "none",
  transition: `color ${vars.duration.fast} ${vars.ease.out}`,
});

globalStyle(`${link}:hover .${arrow}`, {
  transform: "translateX(2px)",
});

export const accent = style({
  color: vars.color.accent,
  ":hover": {
    color: `color-mix(in oklab, ${vars.color.accent} 75%, transparent)`,
  },
});

export const muted = style({
  color: vars.color.foreground,
  ":hover": { color: vars.color.accent },
});
