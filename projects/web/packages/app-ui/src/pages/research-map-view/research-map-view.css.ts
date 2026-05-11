import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

const markerFocusVisible = {
  outline: `2px solid ${vars.color.ring}`,
  outlineOffset: 2,
};

const markerToneSelectors = {
  "&[data-tone='active']": {
    borderColor: vars.color.accent,
    color: vars.color.accent,
  },
  "&[data-tone='success']": {
    borderColor: vars.color.successStrong,
    color: vars.color.successStrong,
  },
  "&[data-tone='warning']": {
    borderColor: vars.color.warningStrong,
    color: vars.color.warningStrong,
  },
  "&[data-tone='danger']": {
    borderColor: vars.color.dangerStrong,
    color: vars.color.dangerStrong,
  },
};

const zIndex = {
  timelineBase: 0,
  span: 1,
  edgeLayer: 3,
  runMarker: 4,
  nodeText: 5,
  nodeMarker: 6,
  clusterMarker: 7,
  stickyLabelColumn: 20,
  stickyRuler: 21,
  stickyCorner: 22,
} as const;

const stickyChromeAcceleration = {
  transform: "translateZ(0)",
  backfaceVisibility: "hidden",
  willChange: "transform",
} as const;

const spanStartPadPx = 2;
const spanEndPadPx = 12;

export const mapFrame = style({
  display: "flex",
  flexDirection: "column",
  maxHeight: "80vh",
  overflow: "hidden",
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.lg,
  background: vars.color.card01Hex,
  boxShadow: vars.shadow.card,
  selectors: {
    "&[data-full-bleed='true']": {
      maxHeight: "100%",
      height: "100%",
      border: 0,
      borderRadius: 0,
      boxShadow: "none",
    },
  },
});

export const mapToolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  minHeight: 44,
  padding: "0 14px",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  background: vars.color.card01Hex,
});

export const toolbarControls = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

export const toneFilterTriggerInner = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

export const toneFilterTriggerLabel = style({
  color: vars.color.mutedForeground,
});

export const toneFilterDot = style({
  width: 8,
  height: 8,
  borderRadius: 999,
  background: vars.color.mutedForegroundTertiary,
  flexShrink: 0,
  opacity: 0.4,
  selectors: {
    "&[data-tone='active']": { background: vars.color.accent },
    "&[data-tone='success']": { background: vars.color.successStrong },
    "&[data-tone='warning']": { background: vars.color.warningStrong },
    "&[data-tone='danger']": { background: vars.color.dangerStrong },
    "[data-checked] &": { opacity: 1 },
  },
});

export const toneFilterItemRow = style({
  display: "grid",
  gridTemplateColumns: "8px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
});

export const toneFilterItemName = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const toneFilterItemCount = style({
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
  fontVariantNumeric: "tabular-nums",
});

export const zoomGroup = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  paddingRight: 6,
  borderRight: `1px solid ${vars.color.border01_5}`,
});

export const nowPill = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 24,
  padding: "0 10px",
  borderRadius: vars.radius.sm,
  background: vars.color.badgePurple,
  color: vars.color.badgePurpleText,
  fontSize: vars.text.productSm,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.01em",
  whiteSpace: "nowrap",
  selectors: {
    "&[data-runstate='finished']": {
      background: vars.color.card02Hex,
      color: vars.color.mutedForeground,
      border: `1px solid ${vars.color.border02}`,
    },
  },
});

export const scrollArea = style({
  flex: "1 1 auto",
  minHeight: 0,
  overflow: "auto",
  background: vars.color.background,
  overscrollBehaviorX: "contain",
});

export const surface = style({
  position: "relative",
  display: "grid",
  // When --canvas-width fits within the parent, stretch the timeline column via
  // 1fr so the lanes/grid/bars fill the viewport instead of leaving empty
  // space at the right. When --canvas-width exceeds the parent, the minmax
  // floor wins and the scrollArea handles horizontal scroll.
  gridTemplateColumns: "320px minmax(var(--canvas-width, 100%), 1fr)",
  gridTemplateRows: "52px var(--body-height, auto)",
  width: "max-content",
  minWidth: "100%",
});

export const cornerCell = style({
  ...stickyChromeAcceleration,
  position: "sticky",
  top: 0,
  left: 0,
  zIndex: zIndex.stickyCorner,
  display: "flex",
  alignItems: "center",
  padding: "0 14px",
  background: vars.color.card01Hex,
  borderRight: `1px solid ${vars.color.border01_5}`,
  borderBottom: `1px solid ${vars.color.border01_5}`,
});

export const rulerRow = style({
  ...stickyChromeAcceleration,
  position: "sticky",
  top: 0,
  zIndex: zIndex.stickyRuler,
  // Clip tick labels and the now-pill that would otherwise extend past the
  // right edge and inflate the surrounding scrollArea's scrollWidth.
  overflow: "hidden",
  background: vars.color.card01Hex,
});

export const labelColumn = style({
  ...stickyChromeAcceleration,
  position: "sticky",
  left: 0,
  zIndex: zIndex.stickyLabelColumn,
  display: "grid",
  gridAutoRows: "56px",
  alignContent: "start",
  background: vars.color.card01Hex,
  borderRight: `1px solid ${vars.color.border01_5}`,
});

export const headerLabel = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const rowLabel = style({
  display: "grid",
  gridTemplateColumns: "10px minmax(0, 1fr)",
  alignItems: "center",
  gap: 12,
  minHeight: 56,
  padding: "8px 14px",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  background: "transparent",
  color: vars.color.foreground,
  textAlign: "left",
});

export const rowToneDot = style({
  width: 10,
  height: 10,
  borderRadius: 999,
  background: vars.color.border03,
  selectors: {
    [`${rowLabel}[data-tone='active'] &`]: {
      background: vars.color.accent,
    },
    [`${rowLabel}[data-tone='success'] &`]: {
      background: vars.color.successStrong,
    },
    [`${rowLabel}[data-tone='warning'] &`]: {
      background: vars.color.warningStrong,
    },
    [`${rowLabel}[data-tone='danger'] &`]: {
      background: vars.color.dangerStrong,
    },
  },
});

export const rowTitleGroup = style({
  display: "grid",
  minWidth: 0,
});

export const rowTitle = style({
  display: "-webkit-box",
  margin: 0,
  overflow: "hidden",
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
  lineHeight: 1.3,
  textOverflow: "ellipsis",
  whiteSpace: "normal",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 3,
});

export const emptyLabelStack = style({
  display: "grid",
  placeItems: "center",
  minHeight: 360,
  padding: "0 14px",
});

export const emptyLabelText = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const ruler = style({
  position: "relative",
  height: "100%",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  background: vars.color.card01Hex,
});

export const majorTick = style({
  position: "absolute",
  top: 8,
  left: "var(--tick-x)",
  transform: "translateX(-50%)",
  color: vars.color.foreground,
  fontSize: vars.text.productBase,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.02em",
});

export const minorTick = style({
  position: "absolute",
  top: 30,
  left: "var(--tick-x)",
  transform: "translateX(-50%)",
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productSm,
  fontVariantNumeric: "tabular-nums",
});

export const nowMarkerPill = style({
  position: "absolute",
  top: 6,
  left: "var(--now-x)",
  zIndex: zIndex.runMarker,
  transform: "translateX(-50%)",
  padding: "1px 6px",
  borderRadius: vars.radius.sm,
  background: vars.color.dangerStrong,
  color: "white",
  fontSize: vars.text.productSm,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.01em",
  whiteSpace: "nowrap",
  selectors: {
    "&[data-runstate='finished']": {
      background: vars.color.mutedForeground,
      color: vars.color.background,
    },
  },
});

export const timelineBody = style({
  position: "relative",
  // Clip experiment node labels that extend past the right edge so they don't
  // inflate the scrollArea's scrollWidth and break horizontal scroll.
  // Existing text-overflow: ellipsis on .nodeLabel handles the visible
  // truncation.
  overflow: "hidden",
  minHeight: 96,
  background: vars.color.background,
});

export const gridLine = style({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "var(--tick-x)",
  zIndex: zIndex.timelineBase,
  width: 1,
  borderLeft: `1px solid ${vars.color.fg05}`,
});

export const rowGuide = style({
  position: "absolute",
  right: 0,
  left: 0,
  top: "var(--lane-top)",
  zIndex: zIndex.timelineBase,
  height: 56,
  borderBottom: `1px solid ${vars.color.border01_5}`,
});

export const nowLine = style({
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "var(--now-x)",
  width: 2,
  background: vars.color.dangerStrong,
  zIndex: zIndex.runMarker,
  pointerEvents: "none",
  selectors: {
    "&[data-runstate='finished']": {
      width: 1,
      background: vars.color.mutedForeground,
      opacity: 0.6,
    },
  },
});

export const laneLayer = style({
  position: "absolute",
  right: 0,
  left: 0,
  top: "var(--lane-top)",
  height: 56,
});

export const spanBar = style({
  position: "absolute",
  top: 22,
  left: `calc(var(--span-left) - ${spanStartPadPx}px)`,
  zIndex: zIndex.span,
  width: `calc(var(--span-width) + ${spanStartPadPx + spanEndPadPx}px)`,
  minWidth: 24,
  height: 24,
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  boxShadow: vars.shadow.card,
  transition: "left 1s linear, width 1s linear",
  selectors: {
    "&[data-tone='active']": {
      borderColor: vars.color.accent,
    },
    "&[data-tone='success']": {
      borderColor: vars.color.successStrong,
    },
    "&[data-tone='warning']": {
      borderColor: vars.color.warningStrong,
    },
    "&[data-tone='danger']": {
      borderColor: vars.color.dangerStrong,
    },
  },
});

export const spanPlaceholder = style({
  position: "absolute",
  top: 26,
  left: "var(--span-left)",
  zIndex: zIndex.span,
  width: "var(--span-width)",
  minWidth: 24,
  height: 8,
  borderRadius: vars.radius.sm,
  transition: "left 1s linear, width 1s linear",
  background: `repeating-linear-gradient(
    90deg,
    ${vars.color.border02} 0,
    ${vars.color.border02} 4px,
    transparent 4px,
    transparent 8px
  )`,
  opacity: 0.55,
  selectors: {
    "&[data-tone='danger']": {
      background: `repeating-linear-gradient(
        90deg,
        ${vars.color.dangerStrong} 0,
        ${vars.color.dangerStrong} 4px,
        transparent 4px,
        transparent 8px
      )`,
    },
  },
});

export const experimentButton = style({
  position: "absolute",
  top: 25,
  left: "var(--node-x)",
  zIndex: zIndex.nodeMarker,
  display: "grid",
  placeItems: "center",
  width: 18,
  height: 18,
  padding: 0,
  border: `2px solid ${vars.color.border03}`,
  borderRadius: 999,
  background: vars.color.card01Hex,
  color: vars.color.mutedForeground,
  boxShadow: vars.shadow.card,
  transform: "translateX(-50%)",
  cursor: "pointer",
  transition: `border-color ${vars.duration.fast} ${vars.ease.out}, color ${vars.duration.fast} ${vars.ease.out}, transform ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": {
    borderColor: vars.color.accent,
    color: vars.color.accent,
    transform: "translateX(-50%) scale(1.1)",
  },
  ":focus-visible": markerFocusVisible,
  selectors: {
    ...markerToneSelectors,
  },
});

export const nodeCore = style({
  width: 6,
  height: 6,
  borderRadius: 999,
  background: "currentColor",
});

export const clusterButton = style({
  position: "absolute",
  top: 19,
  left: "var(--node-x)",
  zIndex: zIndex.clusterMarker,
  display: "grid",
  placeItems: "center",
  minWidth: 30,
  height: 30,
  padding: "0 6px",
  border: `2px solid ${vars.color.border03}`,
  borderRadius: 999,
  background: vars.color.card01Hex,
  color: vars.color.mutedForeground,
  boxShadow: vars.shadow.card,
  transform: "translateX(-50%)",
  cursor: "pointer",
  fontSize: vars.text.productSm,
  fontWeight: 600,
  lineHeight: 1,
  transition: `border-color ${vars.duration.fast} ${vars.ease.out}, color ${vars.duration.fast} ${vars.ease.out}, transform ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": {
    borderColor: vars.color.accent,
    color: vars.color.accent,
    transform: "translateX(-50%) scale(1.08)",
  },
  ":focus-visible": markerFocusVisible,
  selectors: {
    ...markerToneSelectors,
  },
});

export const clusterCount = style({
  fontVariantNumeric: "tabular-nums",
});

export const clusterMenu = style({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 240,
  maxWidth: 320,
});

export const clusterMenuHeading = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.4,
});

export const clusterMenuList = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const clusterMenuItem = style({
  display: "grid",
  gridTemplateColumns: "10px 1fr auto",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "6px 8px",
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: vars.color.foreground,
  fontSize: vars.text.productSm,
  textAlign: "left",
  cursor: "pointer",
  transition: `background ${vars.duration.fast} ${vars.ease.out}`,
  ":hover": {
    background: vars.color.surfaceHover,
  },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: 1,
  },
});

export const clusterMenuDot = style({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 999,
  background: vars.color.mutedForegroundTertiary,
  selectors: {
    [`${clusterMenuItem}[data-tone='active'] &`]: {
      background: vars.color.accent,
    },
    [`${clusterMenuItem}[data-tone='success'] &`]: {
      background: vars.color.successStrong,
    },
    [`${clusterMenuItem}[data-tone='warning'] &`]: {
      background: vars.color.warningStrong,
    },
    [`${clusterMenuItem}[data-tone='danger'] &`]: {
      background: vars.color.dangerStrong,
    },
  },
});

export const clusterMenuItemTitle = style({
  overflow: "hidden",
  fontWeight: 500,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const clusterMenuItemTime = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontVariantNumeric: "tabular-nums",
});

export const nodeLabel = style({
  position: "absolute",
  top: "var(--label-top)",
  left: "var(--node-x)",
  zIndex: zIndex.nodeText,
  maxWidth: 280,
  overflow: "hidden",
  color: vars.color.foreground,
  fontSize: vars.text.productSm,
  fontWeight: 600,
  lineHeight: 1.3,
  textOverflow: "ellipsis",
  transform: "translateX(-8px)",
  whiteSpace: "nowrap",
  pointerEvents: "none",
});

export const nodeMeta = style({
  position: "absolute",
  top: "var(--meta-top)",
  left: "var(--node-x)",
  zIndex: zIndex.nodeText,
  display: "flex",
  gap: 4,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  transform: "translateX(-8px)",
  whiteSpace: "nowrap",
  pointerEvents: "none",
});

export const edgeLayer = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  zIndex: zIndex.edgeLayer,
  overflow: "visible",
  pointerEvents: "none",
});

export const edgePath = style({
  fill: "none",
  stroke: vars.color.mutedForegroundTertiary,
  strokeDasharray: "3 5",
  strokeLinecap: "round",
  strokeWidth: 1,
  vectorEffect: "non-scaling-stroke",
  opacity: 0.45,
  selectors: {
    "&[data-tone='danger']": {
      stroke: vars.color.dangerStrong,
      opacity: 0.6,
    },
  },
});

export const emptyTimelineMessage = style({
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: 24,
  textAlign: "center",
  color: vars.color.mutedForeground,
});

export const emptyTimelineHeading = style({
  margin: 0,
  marginBottom: 6,
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 600,
});

export const emptyTimelineDetail = style({
  margin: 0,
  maxWidth: 360,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
  lineHeight: vars.leading.productBase,
});

export const legend = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 16,
  padding: "10px 14px",
  borderTop: `1px solid ${vars.color.border01_5}`,
  background: vars.color.card01Hex,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
});

export const legendItem = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

export const legendDot = style({
  width: 8,
  height: 8,
  borderRadius: 999,
  background: vars.color.accent,
  selectors: {
    "&[data-tone='active']": {
      background: vars.color.accent,
    },
    "&[data-tone='success']": {
      background: vars.color.successStrong,
    },
    "&[data-tone='warning']": {
      background: vars.color.warningStrong,
    },
    "&[data-tone='danger']": {
      background: vars.color.dangerStrong,
    },
  },
});
