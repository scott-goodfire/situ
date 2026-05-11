import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const block = style({
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  overflow: "hidden",
});

export const filename = style({
  padding: "6px 12px",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const pre = style({
  margin: 0,
  padding: "8px 0",
  fontFamily: vars.font.mono,
  fontSize: vars.text.productBase,
  lineHeight: vars.leading.productBase,
  overflowX: "auto",
});

export const lineMarker = style({
  flexShrink: 0,
  width: 12,
  color: vars.color.mutedForegroundTertiary,
  userSelect: "none",
});

export const line = style({
  display: "flex",
  alignItems: "baseline",
  padding: "0 12px",
});

export const lineAdded = style({
  background: `color-mix(in srgb, ${vars.color.successStrong} 8%, transparent)`,
});

export const lineRemoved = style({
  background: `color-mix(in srgb, ${vars.color.dangerStrong} 6%, transparent)`,
});

globalStyle(`${lineAdded} .${lineMarker}`, {
  color: vars.color.successStrong,
});

globalStyle(`${lineRemoved} .${lineMarker}`, {
  color: vars.color.dangerStrong,
});

export const lineNumber = style({
  flexShrink: 0,
  width: 28,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
  textAlign: "right",
  userSelect: "none",
  marginRight: 8,
});

export const lineText = style({
  color: vars.color.foreground,
  whiteSpace: "pre",
  fontFamily: "inherit",
});
