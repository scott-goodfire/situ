import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

// ---------------------------------------------------------------------------
// Status banner
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Project index table cells
// ---------------------------------------------------------------------------

export const projectCell = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
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

export const projectId = style({
  minWidth: 0,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
  overflowWrap: "anywhere",
});

export const projectPath = style({
  minWidth: 0,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
  overflowWrap: "anywhere",
});

export const projectStatus = style({
  display: "grid",
  gap: 3,
  minWidth: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productBase,
  lineHeight: vars.leading.productBase,
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
  transition: "background-color 80ms ease",
  ":hover": { background: vars.color.fg05 },
  ":focus-visible": {
    outline: `2px solid ${vars.color.ring}`,
    outlineOffset: 2,
  },
});

// ---------------------------------------------------------------------------
// Record cells (linked-row patterns)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Cycle grid (overview lanes)
// ---------------------------------------------------------------------------

export const cycleGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
  "@media": {
    "(max-width: 760px)": { gridTemplateColumns: "1fr" },
  },
});

export const cycleLane = style({
  display: "grid",
  alignContent: "start",
  gap: 8,
  minWidth: 0,
});

globalStyle(`${cycleLane} h3`, {
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

// ---------------------------------------------------------------------------
// Hypothesis card
// ---------------------------------------------------------------------------

export const hypothesisCard = style({
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: "12px 14px",
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
});

export const hypothesisCardHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
});

export const hypothesisCardSummary = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
});

export const hypothesisCardEvidence = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  overflowWrap: "anywhere",
});

export const hypothesisCardExperiment = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  minWidth: 0,
});

// ---------------------------------------------------------------------------
// Agent presence
// ---------------------------------------------------------------------------

export const agentPresence = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  selectors: {
    '&[data-empty="true"]': { color: vars.color.mutedForegroundTertiary },
  },
});

export const agentPresenceAvatars = style({
  display: "inline-flex",
  flex: "0 0 auto",
  alignItems: "center",
});

const agentPresenceChip = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
  marginLeft: -4,
  border: `1px solid ${vars.color.border02}`,
  borderRadius: 999,
  background: vars.color.card02Hex,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: 9,
  fontWeight: 500,
});

export const agentPresenceAvatar = style([
  agentPresenceChip,
  { ":first-child": { marginLeft: 0 } },
]);

export const agentPresenceOverflow = agentPresenceChip;

export const agentPresenceLabel = style({
  minWidth: 0,
  overflowWrap: "anywhere",
});

// ---------------------------------------------------------------------------
// Agent transcript scroller
// ---------------------------------------------------------------------------

export const agentTranscript = style({
  maxHeight: "min(560px, calc(100vh - 260px))",
  overflow: "auto",
  paddingRight: 2,
  scrollBehavior: "smooth",
});

export const agentTranscriptList = style({
  display: "grid",
  gap: 8,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const agentTranscriptRow = style({
  minWidth: 0,
});

export const agentTranscriptAnchor = style({
  width: 1,
  height: 1,
});

// ---------------------------------------------------------------------------
// Transcript item
// ---------------------------------------------------------------------------

const transcriptPulse = keyframes({
  "0%": { boxShadow: `0 0 0 1px ${vars.color.border02}` },
  "70%": { boxShadow: "0 0 0 6px transparent" },
  "100%": { boxShadow: "0 0 0 1px transparent" },
});

export const transcriptItemDot = style({
  width: 8,
  height: 8,
  border: `2px solid ${vars.color.card01Hex}`,
  borderRadius: 999,
  background: vars.color.mutedForegroundTertiary,
  boxShadow: `0 0 0 1px ${vars.color.border02}`,
});

export const transcriptItemContent = style({
  display: "grid",
  gap: 6,
  minWidth: 0,
  padding: "10px 12px",
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
});

export const transcriptItem = style({
  display: "grid",
  gridTemplateColumns: "22px minmax(0, 1fr)",
  gap: 10,
  minWidth: 0,
});

globalStyle(`${transcriptItem}[data-tone="warning"] .${transcriptItemDot}`, {
  background: vars.color.warningStrong,
  boxShadow: `0 0 0 1px color-mix(in srgb, ${vars.color.warningStrong} 30%, transparent)`,
});

globalStyle(`${transcriptItem}[data-tone="danger"] .${transcriptItemDot}`, {
  background: vars.color.dangerStrong,
  boxShadow: `0 0 0 1px color-mix(in srgb, ${vars.color.dangerStrong} 30%, transparent)`,
});

globalStyle(`${transcriptItem}[data-latest="true"] .${transcriptItemDot}`, {
  animation: `${transcriptPulse} 1.8s ease-out infinite`,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});

globalStyle(`${transcriptItem}[data-tone="warning"] .${transcriptItemContent}`, {
  borderColor: `color-mix(in srgb, ${vars.color.warningStrong} 30%, transparent)`,
  background: vars.color.warningSoft,
});

globalStyle(`${transcriptItem}[data-tone="danger"] .${transcriptItemContent}`, {
  borderColor: `color-mix(in srgb, ${vars.color.dangerStrong} 30%, transparent)`,
  background: vars.color.dangerSoft,
});

export const transcriptItemRail = style({
  display: "flex",
  justifyContent: "center",
  paddingTop: 14,
});

export const transcriptItemHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  "@media": {
    "(max-width: 760px)": { flexDirection: "column", gap: 4 },
  },
});

globalStyle(`${transcriptItemHeader} time`, {
  flex: "0 0 auto",
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const transcriptItemTitle = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 5,
  minWidth: 0,
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  fontWeight: 500,
});

export const transcriptItemPreposition = style({
  color: vars.color.mutedForeground,
  fontWeight: 400,
});

export const transcriptItemBody = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  overflowWrap: "anywhere",
});

export const transcriptItemMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const evidenceSummary = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  minWidth: 0,
  "@media": {
    "(max-width: 760px)": { flexDirection: "column" },
  },
});

export const evidenceSummaryText = style({
  minWidth: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  overflowWrap: "anywhere",
});

export const evaluationLatest = style({
  display: "grid",
  gap: 3,
  minWidth: 0,
});

// ---------------------------------------------------------------------------
// Object page (detail page header)
// ---------------------------------------------------------------------------

export const objectPage = style({
  display: "grid",
  gap: 12,
  paddingTop: 22,
  paddingBottom: 20,
  borderBottom: `1px solid ${vars.color.border02}`,
});

export const objectPageHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
});

globalStyle(`${objectPageHeader} h2`, {
  color: vars.color.foreground,
  fontSize: vars.text.displayLg,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
});

export const objectPageEyebrow = style({
  marginBottom: 4,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const objectPageSummary = style({
  maxWidth: 820,
  color: vars.color.mutedForeground,
  fontSize: vars.text.body,
  lineHeight: 1.55,
});

// ---------------------------------------------------------------------------
// Activity timeline
// ---------------------------------------------------------------------------

export const activityList = style({
  display: "grid",
  gap: 8,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const activityItem = style({
  display: "grid",
  gap: 5,
  padding: "9px 0",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  ":last-child": { borderBottom: 0 },
});

globalStyle(`${activityItem} p`, {
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
});

export const activityItemMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});
