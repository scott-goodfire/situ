import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const dashboard = style({
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
  minHeight: 0,
  width: "100%",
  background: vars.color.background,
});

export const headerStrip = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  minHeight: 40,
  padding: "0 16px",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  background: vars.color.card01Hex,
  flexShrink: 0,
});

export const headerLeft = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  overflow: "hidden",
});

export const headerTitle = style({
  margin: 0,
  minWidth: 0,
  overflow: "hidden",
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  fontWeight: 500,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const headerRight = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
});

export const elapsedChip = style({
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: vars.radius.sm,
  background: vars.color.fg05,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.02em",
});

export const projectLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 8px",
  borderRadius: vars.radius.sm,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  textDecoration: "none",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}, color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": {
    background: vars.color.fg05,
    color: vars.color.foreground,
  },
});

export const mapArea = style({
  flex: "1 1 auto",
  minHeight: 0,
  display: "flex",
});
