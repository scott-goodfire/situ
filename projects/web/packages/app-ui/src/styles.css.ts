import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const viewStack = style({
  display: "grid",
  gap: 16,
  padding: "20px 24px",
});

export const cellTitle = style({
  fontWeight: 500,
});

export const cellMuted = style({
  color: vars.color.mutedForeground,
});

export const objectPage = style({
  display: "grid",
  gap: 12,
  paddingTop: 22,
  paddingBottom: 20,
  borderBottom: `1px solid ${vars.color.border02}`,
});

export const objectPageBack = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 4,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
});

export const objectPageHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
});

export const objectPageHeaderText = style({
  display: "grid",
  gap: 0,
});

export const objectPageEyebrow = style({
  margin: 0,
  marginBottom: 4,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const objectPageTitle = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.displayLg,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
});

export const objectPageSummary = style({
  maxWidth: 820,
  color: vars.color.mutedForeground,
  fontSize: vars.text.body,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
});

export const objectPageBadgeRow = style({
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
});

export const detailGrid = style({
  display: "grid",
  gridTemplateColumns: "max-content 1fr",
  columnGap: 16,
  rowGap: 8,
  alignItems: "baseline",
});

export const detailLabel = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
});

export const detailValue = style({
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  overflowWrap: "anywhere",
});

export const activityList = style({
  display: "grid",
  gap: 10,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const activityItem = style({
  display: "grid",
  gap: 4,
  padding: "10px 12px",
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
});

export const activityItemMeta = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const activityItemActor = style({
  fontWeight: 500,
  color: vars.color.foreground,
});

export const activityItemKind = style({
  fontFamily: vars.font.mono,
});

export const activityItemBody = style({
  margin: 0,
  whiteSpace: "pre-wrap",
  color: vars.color.foreground,
  fontSize: vars.text.body,
  lineHeight: 1.5,
});
