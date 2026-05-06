import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const scroll = style({
  width: "100%",
  overflow: "auto",
  borderRadius: vars.radius.md,
  background: vars.color.panel,
  boxShadow: vars.shadow.card,
});

export const table = style({
  width: "100%",
  minWidth: 720,
  borderCollapse: "separate",
  borderSpacing: 0,
  tableLayout: "fixed",
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
});

globalStyle(`${table} th, ${table} td`, {
  padding: "9px 12px",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  textAlign: "left",
  verticalAlign: "top",
});

globalStyle(`${table}[data-density="compact"] th, ${table}[data-density="compact"] td`, {
  paddingTop: 6,
  paddingBottom: 6,
});

globalStyle(`${table} th`, {
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

globalStyle(`${table}[data-sticky-header="true"] th`, {
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: vars.color.panel,
  boxShadow: `0 1px 0 ${vars.color.border02}`,
});

globalStyle(`${table} tbody tr:last-child td`, {
  borderBottom: 0,
});

globalStyle(`${table} tbody tr:hover td`, {
  background: vars.color.fg05,
});

globalStyle(`${table} tbody tr[data-tone="success"] td`, {
  background: vars.color.successSoft,
});

globalStyle(`${table} tbody tr[data-tone="warning"] td`, {
  background: vars.color.warningSoft,
});

globalStyle(`${table} tbody tr[data-tone="danger"] td`, {
  background: vars.color.dangerSoft,
});

globalStyle(
  `${table} tbody tr[data-tone="success"]:hover td, ${table} tbody tr[data-tone="warning"]:hover td, ${table} tbody tr[data-tone="danger"]:hover td`,
  {
    filter: "brightness(0.99)",
  },
);

export const headerLabel = style({
  display: "inline-flex",
  alignItems: "center",
  minWidth: 0,
});

export const headerButton = style({
  all: "unset",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  maxWidth: "100%",
  cursor: "pointer",
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: 2,
  },
});

export const sortIndicator = style({
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  textTransform: "none",
});

export const cell = style({
  minWidth: 0,
  overflowWrap: "anywhere",
  lineHeight: vars.leading.productBase,
});

export const scrollAnchor = style({
  width: 1,
  height: 1,
});
