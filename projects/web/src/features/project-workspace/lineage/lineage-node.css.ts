import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";
import { ROW_HEIGHT } from "./__shared__/constants";

export const card = style({
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 10,
  width: "100%",
  height: ROW_HEIGHT - 12,
  padding: "0 12px",
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  color: vars.color.foreground,
  cursor: "pointer",
  textAlign: "left",
  transition: "background-color 80ms ease, border-color 80ms ease",
  selectors: {
    '&[data-tone="warning"]': {
      borderColor: `color-mix(in srgb, ${vars.color.warningStrong} 30%, transparent)`,
      background: vars.color.warningSoft,
    },
    '&[data-tone="danger"]': {
      borderColor: `color-mix(in srgb, ${vars.color.dangerStrong} 30%, transparent)`,
      background: vars.color.dangerSoft,
    },
    '&[data-tone="success"]': {
      borderColor: `color-mix(in srgb, ${vars.color.successStrong} 30%, transparent)`,
    },
    '&[data-failed="true"]': {
      opacity: 0.55,
    },
    "&:hover": { background: vars.color.fg05 },
    '&[data-selected="true"]': {
      borderColor: vars.color.ring,
      boxShadow: `0 0 0 1px ${vars.color.ring}`,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.ring}`,
      outlineOffset: 2,
    },
  },
});

export const idBadge = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 36,
  height: 22,
  padding: "0 8px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.sm,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const body = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
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

export const meta = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const chips = style({
  display: "inline-flex",
  flexWrap: "nowrap",
  gap: 4,
  overflow: "hidden",
});

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  height: 16,
  padding: "0 5px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.sm,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: 10,
  letterSpacing: vars.tracking.productSm,
});

export const trailing = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: vars.color.mutedForeground,
});

export const criticIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  selectors: {
    '&[data-status="reviewed"]': { color: vars.color.successStrong },
    '&[data-status="concern"]': { color: vars.color.warningStrong },
    '&[data-status="pending"]': { color: vars.color.mutedForegroundTertiary },
  },
});
