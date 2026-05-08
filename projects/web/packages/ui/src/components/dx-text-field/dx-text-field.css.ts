import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const textField = style({
  display: "grid",
  gap: 6,
  maxWidth: 520,
});

export const label = style({
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  fontWeight: 500,
});

export const control = style({
  width: "100%",
  minHeight: 32,
  padding: "0 10px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.background,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: vars.text.productLg,
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: "0.3ch",
  },
  selectors: {
    '&[aria-invalid="true"]': { borderColor: vars.color.dangerStrong },
  },
});

export const description = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
});

export const error = style({
  color: vars.color.dangerStrong,
  fontSize: vars.text.productBase,
});
