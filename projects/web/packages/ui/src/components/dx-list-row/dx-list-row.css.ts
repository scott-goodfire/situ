import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const row = style({
  all: "unset",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  width: "100%",
  padding: "8px 10px",
  borderRadius: vars.radius.sm,
  cursor: "pointer",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": { background: vars.color.fg05 },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: -2,
  },
  selectors: {
    '&[data-active="true"]': { background: vars.color.fg07_5 },
  },
});

export const icon = style({
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  marginTop: 1,
  color: vars.color.mutedForeground,
});

export const content = style({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  flex: "1 1 auto",
  minWidth: 0,
});

export const title = style({
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  fontWeight: 400,
  lineHeight: vars.leading.productBase,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const status = style({
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
  lineHeight: vars.leading.productSm,
  letterSpacing: vars.tracking.productSm,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const meta = style({
  flex: "0 0 auto",
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
  marginTop: 1,
});
