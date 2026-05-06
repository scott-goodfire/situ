import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const command = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px 6px 12px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productBase,
});

export const text = style({
  color: vars.color.foreground,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  userSelect: "text",
});

export const copy = style({
  all: "unset",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: vars.radius.sm,
  background: vars.color.foreground,
  color: vars.color.background,
  cursor: "pointer",
  transition: "background-color 80ms ease",
  ":hover": { background: vars.color.primaryHover },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: 2,
  },
});
