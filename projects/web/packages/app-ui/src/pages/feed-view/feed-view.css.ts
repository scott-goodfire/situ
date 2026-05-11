import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const list = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 12,
});

export const item = style({
  display: "grid",
  gap: 6,
  padding: "12px 14px",
  borderRadius: 8,
  border: `1px solid ${vars.color.border01_5}`,
  background: vars.color.panel,
});

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});

export const body = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
});

export const citations = style({
  margin: 0,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
});

export const emptyState = style({
  margin: 0,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productBase,
});
