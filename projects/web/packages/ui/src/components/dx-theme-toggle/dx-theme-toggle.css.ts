import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const toggle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: 2,
  border: `1px solid ${vars.color.border02}`,
  borderRadius: 999,
  background: vars.color.card01Hex,
});

export const option = style({
  all: "unset",
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 999,
  color: vars.color.mutedForeground,
  cursor: "pointer",
  transition: "background-color 80ms ease, color 80ms ease",
  ":hover": { color: vars.color.foreground },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: 1,
  },
});

export const optionSelected = style({
  background: vars.color.panel,
  color: vars.color.foreground,
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
});
