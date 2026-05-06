import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const frame = style({
  display: "grid",
  gridTemplateColumns: "240px minmax(0, 1fr)",
  width: "100%",
  height: "100%",
  minHeight: 0,
  background: vars.color.panel,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.window,
  overflow: "hidden",
});

export const sidebar = style({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  borderRight: `1px solid ${vars.color.border02}`,
  background: vars.color.card01Hex,
});

export const main = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
});

export const topBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 16px",
  minHeight: 40,
  borderBottom: `1px solid ${vars.color.border02}`,
  background: vars.color.panel,
});

export const content = style({
  flex: "1 1 auto",
  minHeight: 0,
  padding: "24px 28px 32px",
  overflow: "auto",
});
