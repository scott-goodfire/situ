import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const badge = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: 20,
  padding: "0 6px",
  borderRadius: vars.radius.sm,
  background: vars.color.badgeGray,
  color: vars.color.badgeGrayText,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: vars.tracking.productSm,
  whiteSpace: "nowrap",
});

export const success = style({
  background: vars.color.badgeGreen,
  color: vars.color.badgeGreenText,
});

export const warning = style({
  background: vars.color.badgeYellow,
  color: vars.color.badgeYellowText,
});

export const danger = style({
  background: vars.color.badgeRed,
  color: vars.color.badgeRedText,
});

export const withDot = style({
  gap: 6,
});

export const dot = style({
  display: "inline-block",
  width: 6,
  height: 6,
  borderRadius: 999,
  background: "currentColor",
  flexShrink: 0,
});
