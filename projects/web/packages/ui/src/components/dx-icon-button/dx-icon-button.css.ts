import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const iconButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  border: "1px solid transparent",
  borderRadius: vars.radius.sm,
  background: "transparent",
  color: vars.color.mutedForeground,
  cursor: "pointer",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}, color ${vars.duration.fast} ${vars.ease.out}, border-color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": {
    background: vars.color.fg05,
    color: vars.color.foreground,
  },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: "0.3ch",
  },
  ":disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  selectors: {
    "&[data-disabled]": { opacity: 0.5, cursor: "not-allowed" },
  },
});

export const secondary = style({
  borderColor: vars.color.border02_5,
  color: vars.color.foreground,
});

export const small = style({ width: 18, height: 18 });
