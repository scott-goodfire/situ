import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const host = style({
  display: "grid",
  gap: 10,
  minWidth: 0,
});

export const summary = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const summaryLabel = style({
  color: vars.color.mutedForegroundTertiary,
});

export const summaryShas = style({
  color: vars.color.mutedForeground,
});

export const summaryPath = style({
  minWidth: 0,
  overflow: "hidden",
  color: vars.color.mutedForegroundTertiary,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const fileList = style({
  display: "grid",
  gap: 12,
  minWidth: 0,
});

export const diffWrap = style({
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.md,
  overflow: "hidden",
  background: vars.color.card01Hex,
});

export const placeholder = style({
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  padding: "24px 16px",
  color: vars.color.mutedForegroundTertiary,
  fontStyle: "italic",
  textAlign: "center",
});

export const error = style({
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  padding: "24px 16px",
  border: `1px solid ${vars.color.dangerStrong}`,
  borderRadius: vars.radius.md,
  color: vars.color.dangerStrong,
  fontSize: vars.text.productSm,
});

export const truncationNotice = style({
  padding: "8px 12px",
  borderRadius: vars.radius.sm,
  background: `color-mix(in srgb, ${vars.color.warningStrong} 8%, transparent)`,
  border: `1px solid color-mix(in srgb, ${vars.color.warningStrong} 22%, transparent)`,
  color: vars.color.warningStrong,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});
