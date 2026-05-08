import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const layout = style({
  display: "grid",
  gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)",
  gap: 24,
  alignItems: "start",
  paddingTop: 14,
  paddingBottom: 24,
  "@media": {
    "(max-width: 900px)": { gridTemplateColumns: "1fr" },
  },
});

export const header = style({
  display: "grid",
  gap: 6,
  paddingTop: 22,
  paddingBottom: 16,
  borderBottom: `1px solid ${vars.color.border02}`,
});

export const title = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.displayLg,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
});

export const subtitle = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.body,
  lineHeight: 1.5,
});

export const graphScroll = style({
  minWidth: 0,
  overflowX: "auto",
  alignSelf: "start",
});

export const panelColumn = style({
  position: "sticky",
  top: 14,
  alignSelf: "start",
  minWidth: 0,
});
