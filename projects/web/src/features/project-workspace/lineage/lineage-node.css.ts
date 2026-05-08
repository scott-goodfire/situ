import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";
import { ROW_HEIGHT } from "./__shared__/constants";

export const card = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  width: "100%",
  height: ROW_HEIGHT - 6,
  padding: "0 10px",
  border: `1px solid transparent`,
  borderRadius: vars.radius.sm,
  background: "transparent",
  color: vars.color.foreground,
  cursor: "pointer",
  textAlign: "left",
  transition: "background-color 80ms ease, border-color 80ms ease",
  selectors: {
    '&[data-tone="warning"]': {
      borderColor: `color-mix(in srgb, ${vars.color.warningStrong} 22%, transparent)`,
    },
    '&[data-tone="danger"]': {
      borderColor: `color-mix(in srgb, ${vars.color.dangerStrong} 22%, transparent)`,
    },
    '&[data-tone="success"]': {
      borderColor: `color-mix(in srgb, ${vars.color.successStrong} 18%, transparent)`,
    },
    '&[data-failed="true"]': {
      opacity: 0.55,
    },
    "&:hover": { background: vars.color.fg05 },
    '&[data-selected="true"]': {
      borderColor: vars.color.ring,
      background: vars.color.fg05,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.ring}`,
      outlineOffset: 1,
    },
  },
});

export const idBadge = style({
  flex: "0 0 auto",
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const title = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
  lineHeight: 1.2,
});

export const trailing = style({
  display: "flex",
  alignItems: "center",
  flex: "0 0 auto",
});

export const criticIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 14,
  height: 14,
  selectors: {
    '&[data-status="reviewed"]': { color: vars.color.successStrong },
    '&[data-status="concern"]': { color: vars.color.warningStrong },
    '&[data-status="pending"]': { color: vars.color.mutedForegroundTertiary },
  },
});
