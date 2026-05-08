import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const status = style({
  marginTop: 12,
  padding: "0 0 0 10px",
  borderLeft: `2px solid ${vars.color.border02}`,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  selectors: {
    '&[data-tone="warning"]': {
      borderLeftColor: vars.color.warningStrong,
      color: vars.color.warningStrong,
    },
    '&[data-tone="danger"]': {
      borderLeftColor: vars.color.dangerStrong,
      color: vars.color.dangerStrong,
    },
  },
});

export const projectLink = style({
  color: vars.color.foreground,
  fontWeight: 500,
  textDecoration: "none",
  ":hover": {
    textDecoration: "underline",
    textDecorationColor: vars.color.border02_5,
    textUnderlineOffset: 3,
  },
});

export const projectOpen = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 24,
  padding: "0 8px",
  border: `1px solid ${vars.color.border02_5}`,
  borderRadius: vars.radius.sm,
  background: "transparent",
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  fontWeight: 500,
  letterSpacing: vars.tracking.productSm,
  textDecoration: "none",
  transition: `background-color ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": { background: vars.color.fg05 },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: 2,
  },
});

export const recordCell = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
});

export const recordLink = style({
  color: vars.color.foreground,
  fontWeight: 500,
  textDecoration: "none",
  ":hover": {
    textDecoration: "underline",
    textDecorationColor: vars.color.border02_5,
    textUnderlineOffset: 3,
  },
});

export const recordId = style({
  minWidth: 0,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
  overflowWrap: "anywhere",
});

export const evaluationLatest = style({
  display: "grid",
  gap: 3,
  minWidth: 0,
});
