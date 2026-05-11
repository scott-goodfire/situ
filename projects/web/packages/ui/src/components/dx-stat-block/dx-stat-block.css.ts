import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const block = style({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 24,
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
});

export const value = style({
  color: vars.color.foreground,
  fontSize: "3rem",
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
  lineHeight: 1,
});

export const caption = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
});

export const detail = style({
  marginTop: 6,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});
