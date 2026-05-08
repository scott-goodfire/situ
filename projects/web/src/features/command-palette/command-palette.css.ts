import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const dialog = style({});

export const overlay = style({
  position: "fixed",
  inset: 0,
  background: `color-mix(in oklab, ${vars.color.foreground} 25%, transparent)`,
  zIndex: 50,
});

export const content = style({
  position: "fixed",
  top: "16vh",
  left: "50%",
  transform: "translateX(-50%)",
  width: "min(640px, calc(100vw - 32px))",
  maxHeight: "min(560px, 70vh)",
  display: "flex",
  flexDirection: "column",
  borderRadius: vars.radius.lg,
  background: vars.color.cardHex,
  boxShadow: vars.shadow.window,
  border: `1px solid ${vars.color.border02}`,
  overflow: "hidden",
  zIndex: 51,
});

export const visuallyHidden = style({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
});

export const input = style({
  all: "unset",
  boxSizing: "border-box",
  width: "100%",
  padding: "14px 18px",
  fontSize: vars.text.body,
  fontFamily: vars.font.sans,
  color: vars.color.foreground,
  borderBottom: `1px solid ${vars.color.border02}`,
  background: "transparent",
  "::placeholder": { color: vars.color.mutedForegroundTertiary },
});

export const list = style({
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  padding: "6px 6px 10px",
});

export const empty = style({
  padding: "24px 18px",
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productLg,
  textAlign: "center",
  fontStyle: "italic",
});

export const group = style({
  padding: "6px 0",
});

globalStyle(`${group} [cmdk-group-heading]`, {
  padding: "8px 12px 4px",
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: vars.tracking.wide,
  textTransform: "uppercase",
});

export const item = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderRadius: vars.radius.sm,
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  cursor: "pointer",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}`,
  selectors: {
    "&[data-selected='true']": { background: vars.color.fg05 },
  },
});

export const itemIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  color: vars.color.mutedForeground,
});

export const itemId = style({
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
  minWidth: 28,
});

export const itemLabel = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const itemHint = style({
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.wide,
  textTransform: "uppercase",
});

export const hintButton = style({
  all: "unset",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px",
  borderRadius: vars.radius.sm,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
  cursor: "pointer",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}, color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": {
    background: vars.color.fg05,
    color: vars.color.foreground,
  },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: 1,
  },
});

export const hintIcon = style({
  flexShrink: 0,
  color: "inherit",
});

export const hintLabel = style({
  flex: "1 1 auto",
  textAlign: "left",
});
