import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const tabs = style({
  display: "flex",
  flexDirection: "column",
  width: "100%",
});

export const list = style({
  position: "relative",
  display: "flex",
  gap: 0,
  borderBottom: `1px solid ${vars.color.border02}`,
});

export const tab = style({
  all: "unset",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  cursor: "pointer",
  position: "relative",
  transition: "color 80ms ease",
  ":hover": { color: vars.color.foreground },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: -2,
    borderRadius: vars.radius.sm,
  },
  selectors: {
    "&[data-selected]": {
      color: vars.color.foreground,
      background: vars.color.card01Hex,
    },
  },
});

export const panel = style({
  flex: "1 1 auto",
  outline: "none",
});
