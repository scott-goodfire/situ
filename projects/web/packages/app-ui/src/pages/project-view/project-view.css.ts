import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const project = style({
  display: "grid",
  gap: 20,
  padding: "20px 24px",
  maxWidth: 960,
});

export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  paddingBottom: 16,
  borderBottom: `1px solid ${vars.color.border01_5}`,
});

export const headerText = style({
  display: "grid",
  gap: 6,
  minWidth: 0,
});

export const eyebrow = style({
  margin: 0,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const title = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.displayMd,
  fontWeight: 500,
  lineHeight: 1.25,
});

export const sectionLabel = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const statsGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
});

export const block = style({
  display: "grid",
  gap: 10,
});

export const prose = style({
  color: vars.color.foreground,
  fontSize: vars.text.body,
  lineHeight: 1.6,
});

export const empty = style({
  margin: 0,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.body,
  fontStyle: "italic",
});

export const reportFooter = style({
  marginTop: 4,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
});
