import { style } from "@vanilla-extract/css";
import { vars } from "../../theme.css";

export const frame = style({
  display: "grid",
  gridTemplateColumns: "240px minmax(0, 1fr)",
  width: "100vw",
  height: "100vh",
  minHeight: 0,
  background: vars.color.panel,
  overflow: "hidden",
  "@media": {
    "(max-width: 760px)": {
      gridTemplateColumns: "1fr",
      gridTemplateRows: "auto minmax(0, 1fr)",
    },
  },
});

export const sidebar = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
  borderRight: `1px solid ${vars.color.border02}`,
  background: vars.color.card01Hex,
  "@media": {
    "(max-width: 760px)": {
      borderRight: 0,
      borderBottom: `1px solid ${vars.color.border02}`,
    },
  },
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
  "@media": {
    "(max-width: 760px)": {
      padding: "20px 16px 28px",
    },
  },
});

export const contentFullBleed = style({
  flex: "1 1 auto",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  overflow: "hidden",
});
