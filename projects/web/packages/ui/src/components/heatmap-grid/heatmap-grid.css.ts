import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const root = style({
  display: "grid",
  gap: 10,
});

export const title = style({
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
});

export const matrix = style({
  display: "grid",
  gap: 4,
  alignItems: "stretch",
  minWidth: 0,
});

export const columnLabel = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  overflow: "hidden",
  textAlign: "center",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const rowLabel = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  minHeight: 30,
});

export const cell = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 0,
  minHeight: 30,
  borderRadius: vars.radius.sm,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  fontWeight: 500,
});
