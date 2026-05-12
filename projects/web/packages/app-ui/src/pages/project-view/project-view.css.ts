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

export const proseTruncated = style([
  prose,
  {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
]);

export const expandToggle = style({
  alignSelf: "flex-start",
  marginTop: 4,
  padding: 0,
  background: "none",
  border: "none",
  color: vars.color.mutedForeground,
  fontFamily: "inherit",
  fontSize: vars.text.productSm,
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 3,
  selectors: {
    "&:hover": {
      color: vars.color.foreground,
    },
  },
});

export const baselineList = style({
  listStyle: "none",
  margin: 0,
  marginTop: 6,
  padding: 0,
  display: "grid",
  gap: 10,
});

export const baselineEntry = style({
  display: "block",
});

export const baselineEntryBody = style({
  display: "grid",
  gap: 10,
});

export const baselineEntryHeader = style({
  display: "grid",
  gap: 4,
});

export const baselineEyebrow = style({
  margin: 0,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
});

export const baselineTitle = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
});

export const evaluationsBlock = style({
  display: "grid",
  gap: 8,
});

export const evaluationsLabel = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const evaluationList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 10,
});

export const evaluationItem = style({
  display: "grid",
  gap: 8,
  paddingLeft: 10,
  borderLeft: `2px solid ${vars.color.border01_5}`,
});

export const evaluationHeader = style({
  display: "grid",
  gap: 2,
});

export const evaluationEyebrow = style({
  margin: 0,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
});

export const evaluationTitle = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  fontWeight: 500,
});

export const measurementsBlock = style({
  display: "grid",
  gap: 6,
});

export const measurementsLabel = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const measurementList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 6,
});

export const measurementItem = style({
  display: "grid",
  gap: 2,
  paddingLeft: 10,
  borderLeft: `2px solid ${vars.color.border01_5}`,
  fontSize: vars.text.body,
  color: vars.color.foreground,
});

export const measurementBody = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  whiteSpace: "pre-wrap",
});
