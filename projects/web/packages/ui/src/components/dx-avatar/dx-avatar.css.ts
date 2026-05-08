import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const avatar = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: `1px solid ${vars.color.border02}`,
  borderRadius: 999,
  background: vars.color.card02Hex,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  overflow: "hidden",
  userSelect: "none",
});

export const md = style({ width: 22, height: 22 });
export const sm = style({ width: 18, height: 18, fontSize: 9 });

globalStyle(`${avatar} + ${avatar}`, {
  marginLeft: -4,
});

export const image = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const fallback = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
});
