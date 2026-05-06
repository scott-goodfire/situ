import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const sidebar = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
});

export const header = style({
  padding: "12px 14px 10px",
  borderBottom: `1px solid ${vars.color.border01_5}`,
});

export const body = style({
  flex: "1 1 auto",
  minHeight: 0,
  padding: "8px 0",
  overflowY: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: `${vars.color.border02_5} transparent`,
});

globalStyle(`${body}::-webkit-scrollbar`, { width: 6 });
globalStyle(`${body}::-webkit-scrollbar-thumb`, {
  background: vars.color.border02_5,
  borderRadius: 999,
});
globalStyle(`${body}::-webkit-scrollbar-thumb:hover`, {
  background: vars.color.border03,
});

export const footer = style({
  padding: "10px 14px",
  borderTop: `1px solid ${vars.color.border01_5}`,
});

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: 1,
  padding: "6px 6px",
  selectors: {
    "& + &": { marginTop: 6 },
  },
});

export const sectionHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  padding: "6px 8px 4px",
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const sectionTitle = style({});

export const sectionCount = style({
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  fontWeight: 400,
  letterSpacing: vars.tracking.productSm,
  textTransform: "none",
});

export const sectionItems = style({
  display: "flex",
  flexDirection: "column",
  gap: 1,
});

export const itemIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: 14,
  height: 14,
  color: vars.color.mutedForeground,
});

export const itemBadge = style({
  flexShrink: 0,
  minWidth: 18,
  padding: "0 6px",
  height: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: vars.radius.sm,
  background: vars.color.fg07_5,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  fontWeight: 400,
  letterSpacing: vars.tracking.productSm,
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 8px",
  borderRadius: vars.radius.sm,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
  fontWeight: 400,
  letterSpacing: vars.tracking.productSm,
  textDecoration: "none",
  cursor: "pointer",
  transition: "background-color 80ms ease, color 80ms ease",
  ":hover": {
    background: vars.color.fg05,
    color: vars.color.foreground,
  },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: -2,
  },
});

globalStyle(`${item}:hover .${itemIcon}`, {
  color: vars.color.foreground,
});

export const itemActive = style({
  background: vars.color.fg07_5,
  color: vars.color.foreground,
  fontWeight: 500,
});

globalStyle(`${itemActive} .${itemIcon}`, {
  color: vars.color.foreground,
});
globalStyle(`${itemActive} .${itemBadge}`, {
  background: vars.color.fg10,
  color: vars.color.foreground,
});

export const itemLabel = style({
  flex: "1 1 auto",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
