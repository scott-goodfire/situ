import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const kbd = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  border: `1px solid ${vars.color.border02_5}`,
  borderRadius: vars.radius.sm,
  background: vars.color.card02Hex,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  lineHeight: 1,
});

export const small = style({
  minWidth: 14,
  height: 14,
  padding: "0 3px",
  fontSize: 9,
});
