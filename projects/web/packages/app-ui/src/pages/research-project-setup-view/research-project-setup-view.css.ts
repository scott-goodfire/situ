import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const layout = style({
  display: "grid",
  gap: 16,
});

export const form = style({
  display: "grid",
  gap: 12,
  maxWidth: 820,
});

export const field = style({
  display: "grid",
  gap: 6,
});

export const label = style({
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  fontWeight: 500,
});

export const textarea = style({
  minHeight: 112,
  resize: "vertical",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  color: vars.color.foreground,
  font: "inherit",
  fontSize: vars.text.productLg,
  lineHeight: 1.5,
  padding: "9px 10px",
});

export const actions = style({
  display: "flex",
  gap: 8,
  alignItems: "center",
});

export const goalCard = style({
  display: "grid",
  gap: 10,
});

export const goalHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
});

export const goalTitle = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 600,
});

export const goalText = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.body,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
});

export const checkpointList = style({
  display: "grid",
  gap: 10,
});

export const checkpoint = style({
  display: "grid",
  gap: 10,
});

export const checkpointHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
});

export const checkpointTitle = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 600,
});

export const checkpointText = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.body,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
});

export const detailText = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.body,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
});

export const error = style({
  color: vars.color.dangerStrong,
  fontSize: vars.text.productBase,
});
