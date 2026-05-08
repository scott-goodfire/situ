import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

export const commandPre = style({
  margin: 0,
  width: "max-content",
  padding: "8px 10px",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productBase,
});

export const viewStack = style({
  display: "grid",
  gap: 16,
});

export const viewStackWide = style({
  display: "grid",
  gap: 18,
});

export const viewStackTight = style({
  display: "grid",
  gap: 12,
});

export const pageHeader = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
});

export const pageHeaderTitle = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.displayMd,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
});

export const pageHeaderSubtitle = style({
  margin: "4px 0 0",
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
});

export const cellTitle = style({
  fontWeight: 500,
});

export const cellMuted = style({
  color: vars.color.mutedForeground,
});

export const monoTertiary = style({
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  color: vars.color.mutedForegroundTertiary,
});

export const monoMuted = style({
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  color: vars.color.mutedForeground,
  overflowWrap: "anywhere",
});

export const markdownBlock = style({
  minWidth: 0,
  color: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  overflowWrap: "anywhere",
});

export const markdownInline = style({
  display: "inline",
  minWidth: 0,
  color: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  overflowWrap: "anywhere",
});

globalStyle(`${markdownBlock} > :first-child`, {
  marginTop: 0,
});

globalStyle(`${markdownBlock} > :last-child`, {
  marginBottom: 0,
});

globalStyle(`${markdownBlock} p`, {
  margin: "0 0 0.65em",
});

globalStyle(`${markdownBlock} h1, ${markdownBlock} h2, ${markdownBlock} h3, ${markdownBlock} h4, ${markdownBlock} h5, ${markdownBlock} h6`, {
  margin: "0.8em 0 0.35em",
  color: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  fontWeight: 700,
  letterSpacing: 0,
  textDecoration: "underline",
  textDecorationColor: vars.color.border02_5,
  textUnderlineOffset: 3,
});

globalStyle(`${markdownBlock} ul, ${markdownBlock} ol`, {
  margin: "0 0 0.65em",
  paddingLeft: 20,
});

globalStyle(`${markdownBlock} li`, {
  margin: "0.15em 0",
});

globalStyle(`${markdownBlock} li > p`, {
  margin: 0,
});

globalStyle(`${markdownBlock} pre`, {
  maxWidth: "100%",
  margin: "0 0 0.75em",
  padding: "8px 10px",
  overflow: "auto",
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.sm,
  background: vars.color.card02Hex,
});

globalStyle(`${markdownBlock} table`, {
  width: "max-content",
  maxWidth: "100%",
  margin: "0 0 0.75em",
  borderCollapse: "collapse",
  fontSize: vars.text.productBase,
});

globalStyle(`${markdownBlock} th, ${markdownBlock} td`, {
  padding: "4px 7px",
  border: `1px solid ${vars.color.border02}`,
  textAlign: "left",
  verticalAlign: "top",
});

globalStyle(`${markdownBlock} th`, {
  color: vars.color.foreground,
  fontWeight: 600,
  background: vars.color.fg05,
});

globalStyle(`${markdownBlock} blockquote`, {
  margin: "0 0 0.75em",
  paddingLeft: 10,
  borderLeft: `2px solid ${vars.color.border02_5}`,
  color: vars.color.mutedForeground,
});

globalStyle(`${markdownBlock} code, ${markdownInline} code`, {
  padding: "1px 4px",
  border: `1px solid ${vars.color.border01_5}`,
  borderRadius: vars.radius.sm,
  background: vars.color.fg05,
  color: vars.color.foreground,
  fontFamily: vars.font.mono,
  fontSize: "0.95em",
});

globalStyle(`${markdownBlock} pre code`, {
  padding: 0,
  border: 0,
  borderRadius: 0,
  background: "transparent",
  fontSize: "inherit",
});

globalStyle(`${markdownBlock} a, ${markdownInline} a`, {
  color: vars.color.foreground,
  textDecoration: "underline",
  textDecorationColor: vars.color.border02_5,
  textUnderlineOffset: 3,
});

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

export const projectCellStack = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
});

export const projectCell = projectCellStack;

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

export const dashboardSection = style({
  display: "grid",
  gap: 8,
  paddingTop: 14,
  paddingBottom: 14,
  borderBottom: `1px solid ${vars.color.border02}`,
  ":last-child": { borderBottom: 0 },
});

export const dashboardSectionLabel = style({
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.wide,
  textTransform: "uppercase",
});

export const dashboardHeaderTitle = style({
  margin: 0,
  color: vars.color.foreground,
  fontSize: vars.text.displayMd,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
});

export const dashboardHeaderActive = style({
  color: vars.color.foreground,
  fontSize: vars.text.body,
  lineHeight: vars.leading.body,
});

export const dashboardHeaderContext = style({
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const dashboardCounts = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 24,
  alignItems: "baseline",
  color: vars.color.foreground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productLg,
});

export const dashboardCount = style({
  display: "inline-flex",
  gap: 6,
  alignItems: "baseline",
});

export const dashboardCountLabel = style({
  color: vars.color.mutedForeground,
});

export const dashboardCountConcern = style({
  color: vars.color.warningStrong,
  fontWeight: 600,
});

export const dashboardCountBudgetBar = style({
  marginLeft: 4,
  color: vars.color.mutedForegroundTertiary,
});

export const taskBoard = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 18,
  "@media": {
    "(max-width: 760px)": { gridTemplateColumns: "1fr" },
  },
});

export const taskLegend = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "6px 14px",
  alignItems: "center",
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
});

export const taskLegendItem = style({
  display: "inline-flex",
  gap: 5,
  alignItems: "baseline",
  selectors: {
    '&[data-tone="neutral"]': { color: vars.color.mutedForeground },
    '&[data-tone="success"]': { color: vars.color.successStrong },
    '&[data-tone="warning"]': { color: vars.color.warningStrong },
    '&[data-tone="danger"]': { color: vars.color.dangerStrong },
  },
});

export const taskLegendGlyph = style({
  width: 10,
  textAlign: "center",
});

export const taskColumn = style({
  display: "grid",
  alignContent: "start",
  gap: 6,
  minWidth: 0,
});

export const taskColumnTitle = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  fontWeight: 600,
  letterSpacing: vars.tracking.wide,
  textTransform: "uppercase",
});

export const taskColumnEmpty = style({
  color: vars.color.mutedForegroundTertiary,
  fontStyle: "italic",
});

export const taskRow = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  minWidth: 0,
  color: vars.color.foreground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
  selectors: {
    '&[data-tone="info"]': { color: vars.color.foreground },
    '&[data-tone="success"]': { color: vars.color.successStrong },
    '&[data-tone="warning"]': { color: vars.color.warningStrong },
    '&[data-tone="danger"]': { color: vars.color.dangerStrong },
  },
});

export const taskRowGlyph = style({
  flexShrink: 0,
  width: 14,
  textAlign: "center",
  fontFamily: vars.font.mono,
});

export const taskRowTitle = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const dashboardActivityList = style({
  display: "grid",
  gap: 4,
  minWidth: 0,
  maxWidth: "100%",
  maxHeight: 290,
  margin: 0,
  padding: 10,
  border: `1px solid ${vars.color.border02}`,
  borderRadius: vars.radius.md,
  background: vars.color.card01Hex,
  listStyle: "none",
  overflow: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: `${vars.color.border02_5} transparent`,
});

export const dashboardActivityRow = style({
  display: "grid",
  gridTemplateColumns: "148px max-content",
  gap: 12,
  alignItems: "baseline",
  width: "max-content",
  minWidth: "100%",
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
});

export const dashboardActivityLabel = style({
  display: "inline-flex",
  gap: 6,
  alignItems: "baseline",
  color: vars.color.mutedForeground,
  fontFamily: vars.font.mono,
  fontSize: vars.text.productSm,
  letterSpacing: vars.tracking.productSm,
  textTransform: "lowercase",
  selectors: {
    '&[data-tone="info"]': { color: vars.color.foreground },
    '&[data-tone="warning"]': { color: vars.color.warningStrong },
    '&[data-tone="danger"]': { color: vars.color.dangerStrong },
  },
});

export const dashboardActivityTime = style({
  color: vars.color.mutedForeground,
});

export const dashboardActivityBody = style({
  color: vars.color.foreground,
  minWidth: 0,
  overflow: "visible",
  textOverflow: "clip",
  whiteSpace: "nowrap",
  selectors: {
    '&[data-tone="warning"]': { color: vars.color.warningStrong },
    '&[data-tone="danger"]': { color: vars.color.dangerStrong },
  },
});

export const dashboardEmpty = style({
  color: vars.color.mutedForegroundTertiary,
  fontStyle: "italic",
});

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

export const objectPageBadgeRow = style({
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
});

export const dependencyList = style({
  display: "grid",
  gap: 4,
});

export const activityList = style({
  display: "grid",
  gap: 8,
  minWidth: 0,
  maxWidth: "100%",
  margin: 0,
  padding: "0 0 4px",
  listStyle: "none",
});

export const activityItem = style({
  display: "grid",
  gap: 5,
  width: "100%",
  minWidth: 0,
  padding: "9px 0",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  ":last-child": { borderBottom: 0 },
});

export const activityItemBody = style({
  maxWidth: 900,
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
