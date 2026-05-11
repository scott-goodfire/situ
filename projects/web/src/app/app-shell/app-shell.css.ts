import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const topBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 12,
  padding: "8px 16px",
});

export const syncing = style({
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
});

export const content = style({
  display: "grid",
  gap: 12,
  padding: "12px 16px 24px",
});

export const contentFullBleed = style({
  display: "flex",
  flexDirection: "column",
  flex: "1 1 auto",
  minHeight: 0,
});

export const syncingPanel = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
});

export const sidebarThemeFooter = style({
  display: "flex",
  justifyContent: "flex-start",
});

export const settingsGate = style({
  minHeight: "100%",
  display: "grid",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
});

export const settingsCard = style({
  width: "min(100%, 440px)",
});

export const settingsHeader = style({
  display: "grid",
  gap: 6,
  marginBottom: 16,
});

export const settingsTitle = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.displaySm,
  fontWeight: 650,
  letterSpacing: 0,
});

export const settingsText = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.body,
});

export const settingsForm = style({
  display: "grid",
  gap: 14,
});

export const settingsActions = style({
  display: "flex",
  justifyContent: "flex-end",
});
