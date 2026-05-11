import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const button = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  minHeight: 24,
  padding: "0 8px",
  border: "1px solid transparent",
  borderRadius: vars.radius.sm,
  fontFamily: vars.font.sans,
  fontSize: vars.text.productBase,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: vars.tracking.productSm,
  cursor: "pointer",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}, border-color ${vars.duration.fast} ${vars.ease.out}, color ${vars.duration.fast} ${vars.ease.out}`,
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: "0.3ch",
  },
  ":disabled": {
    cursor: "not-allowed",
    opacity: 0.56,
  },
  selectors: {
    "&[data-disabled]": {
      cursor: "not-allowed",
      opacity: 0.56,
    },
  },
});

export const primary = style({
  background: vars.color.primary,
  color: vars.color.primaryForeground,
  ":hover": { background: vars.color.primaryHover },
});

export const secondary = style({
  borderColor: vars.color.border02_5,
  background: "transparent",
  color: vars.color.foreground,
  ":hover": { background: vars.color.fg05 },
});

export const ghost = style({
  background: "transparent",
  color: vars.color.foreground,
  ":hover": { background: vars.color.fg05 },
});

export const dangerVariant = style({
  borderColor: `color-mix(in srgb, ${vars.color.dangerStrong} 30%, transparent)`,
  background: vars.color.dangerSoft,
  color: vars.color.dangerStrong,
  ":hover": {
    background: `color-mix(in srgb, ${vars.color.dangerStrong} 12%, transparent)`,
  },
});

export const small = style({
  minHeight: 20,
  padding: "0 6px",
  fontSize: vars.text.productSm,
});

export const icon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});
