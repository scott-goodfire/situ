import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const accordion = style({
  display: "flex",
  flexDirection: "column",
});

export const item = style({
  borderTop: `1px solid ${vars.color.border02}`,
  ":last-child": {
    borderBottom: `1px solid ${vars.color.border02}`,
  },
});

export const header = style({ margin: 0 });

export const chevron = style({
  flexShrink: 0,
  color: vars.color.mutedForeground,
  transition: `transform ${vars.duration.fast} ${vars.ease.out}`,
});

export const trigger = style({
  all: "unset",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  padding: "14px 0",
  cursor: "pointer",
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: 2,
  },
});

globalStyle(`${trigger}[data-panel-open] .${chevron}`, {
  transform: "rotate(180deg)",
});

export const question = style({
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  textAlign: "left",
});

export const panel = style({
  overflow: "hidden",
  height: "var(--accordion-panel-height)",
  transition: `height ${vars.duration.slow} ${vars.ease.inOut}`,
  selectors: {
    "&[data-starting-style]": { height: 0 },
    "&[data-ending-style]": { height: 0 },
  },
});

export const answer = style({
  padding: "0 0 14px",
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
});
