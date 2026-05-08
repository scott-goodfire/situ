import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const panel = style({
  display: "grid",
  gap: 14,
  padding: "16px 18px",
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  minHeight: 0,
  overflow: "auto",
  maxHeight: "calc(100vh - 140px)",
});

export const header = style({
  display: "grid",
  gap: 8,
  paddingBottom: 12,
  borderBottom: `1px solid ${vars.color.border02}`,
});

export const headerTop = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
});

export const eyebrow = style({
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const titleEl = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.displayMd,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
});

export const summary = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.body,
  lineHeight: 1.5,
});

export const lineageMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const placeholder = style({
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: 8,
  padding: "32px 18px",
  border: `1px dashed ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  color: vars.color.mutedForegroundTertiary,
  fontStyle: "italic",
  textAlign: "center",
});

export const linkedItem = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 10,
  padding: "8px 0",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  ":last-child": { borderBottom: 0 },
});

export const linkedItemList = style({
  display: "grid",
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const linkedItemId = style({
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const linkedItemBody = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
});

export const linkedItemTitle = style({
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
  textDecoration: "none",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  ":hover": {
    textDecoration: "underline",
    textDecorationColor: vars.color.border02_5,
    textUnderlineOffset: 3,
  },
});

export const linkedItemSummary = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
