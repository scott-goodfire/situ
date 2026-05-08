import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";
import { ROW_HEIGHT } from "./__shared__/constants";

export const container = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignItems: "stretch",
  gap: 10,
  paddingTop: 8,
  paddingBottom: 24,
});

export const laneArea = style({
  position: "relative",
  flex: "0 0 auto",
});

export const laneSvg = style({
  display: "block",
  overflow: "visible",
  color: vars.color.mutedForegroundTertiary,
});

export const lanePipe = style({
  stroke: "currentColor",
  fill: "none",
});

export const laneDot = style({
  fill: vars.color.foreground,
  selectors: {
    '&[data-tone="warning"]': { fill: vars.color.warningStrong },
    '&[data-tone="success"]': { fill: vars.color.successStrong },
    '&[data-tone="danger"]': { fill: vars.color.dangerStrong },
    '&[data-tone="neutral"]': { fill: vars.color.foreground },
  },
});

export const rowsColumn = style({
  position: "relative",
  display: "grid",
  gridAutoRows: `${ROW_HEIGHT}px`,
  gap: 0,
  minWidth: 0,
});

export const rowSlot = style({
  display: "flex",
  alignItems: "center",
  minWidth: 0,
});

export const empty = style({
  padding: "32px 0",
  color: vars.color.mutedForegroundTertiary,
  fontStyle: "italic",
});
