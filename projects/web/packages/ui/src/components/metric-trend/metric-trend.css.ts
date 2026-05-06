import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const root = style({
  display: "grid",
  gap: 10,
  minWidth: 0,
});

export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
});

export const label = style({
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
});

export const summary = style({
  marginTop: 2,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productBase,
});

export const delta = style({
  fontFamily: vars.font.mono,
  fontSize: vars.text.productBase,
  fontWeight: 500,
  whiteSpace: "nowrap",
});

export const chart = style({
  width: "100%",
  height: 170,
});
