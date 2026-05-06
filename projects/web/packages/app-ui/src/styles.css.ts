import { style } from "@vanilla-extract/css";
import { vars } from "@situ/web-ui";

// ---------------------------------------------------------------------------
// Inline command sample (no-active-harness + project-index empty state)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// View layout
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page header (table views)
// ---------------------------------------------------------------------------

export const pageHeader = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
});

export const pageHeaderTitle = style({
  margin: 0,
  fontSize: vars.text.displayMd,
  fontWeight: 500,
  letterSpacing: vars.tracking.display,
});

export const pageHeaderSubtitle = style({
  margin: "4px 0 0",
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
});

// ---------------------------------------------------------------------------
// Cell utilities
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SituShell sidebar
// ---------------------------------------------------------------------------

export const sidebarHeader = style({
  display: "grid",
  gap: 2,
});

export const sidebarBrand = style({
  fontSize: 13,
  fontWeight: 500,
  color: vars.color.foreground,
});

export const sidebarWorkspace = style({
  fontSize: 11,
  color: vars.color.mutedForegroundTertiary,
  fontFamily: vars.font.mono,
});

export const sidebarFooter = style({
  fontSize: 11,
  color: vars.color.mutedForegroundTertiary,
});

export const topBarActions = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

// ---------------------------------------------------------------------------
// Project index cells
// ---------------------------------------------------------------------------

export const projectCellStack = style({
  display: "grid",
  gap: 2,
});

// ---------------------------------------------------------------------------
// Run monitor view
// ---------------------------------------------------------------------------

export const runHeader = style({
  display: "grid",
  gap: 4,
});

export const runHeaderMeta = style({
  display: "flex",
  gap: 12,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
});

export const fieldList = style({
  display: "grid",
  gap: 0,
});

export const fieldRow = style({
  display: "grid",
  gridTemplateColumns: "140px 1fr 110px",
  gap: 12,
  padding: "6px 0",
  borderBottom: `1px solid ${vars.color.border01_5}`,
  alignItems: "center",
});

export const fieldRowEvent = style({
  display: "grid",
  gridTemplateColumns: "180px 140px 1fr",
  gap: 12,
  padding: "6px 0",
  borderBottom: `1px solid ${vars.color.border01_5}`,
});

export const emptyText = style({
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productLg,
});

// ---------------------------------------------------------------------------
// No active harness
// ---------------------------------------------------------------------------

export const harnessActionStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "center",
});

// ---------------------------------------------------------------------------
// Overview page
// ---------------------------------------------------------------------------

export const overviewHeader = style({
  display: "grid",
  gap: 4,
});

export const overviewEyebrow = style({
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: vars.color.mutedForeground,
});

export const overviewLanes = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
});

export const overviewLane = style({
  display: "grid",
  alignContent: "start",
  gap: 8,
  minWidth: 0,
});

export const overviewLaneTitle = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productSm,
  fontWeight: 500,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const overviewLaneEmpty = style({
  margin: 0,
  color: vars.color.mutedForegroundTertiary,
  fontSize: vars.text.productLg,
});

export const cardStack = style({
  display: "grid",
  gap: 10,
});

export const cardHeader = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
});

export const cardTitleStack = style({
  display: "grid",
  gap: 2,
  minWidth: 0,
});

export const cardTitle = style({
  fontSize: vars.text.productLg,
  fontWeight: 500,
});

export const cardSummary = style({
  margin: 0,
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
  lineHeight: vars.leading.productBase,
});

export const cardAgents = style({
  color: vars.color.mutedForeground,
  fontSize: vars.text.productLg,
});

export const cardFooter = style({
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
});

export const cardLabel = style({
  fontSize: vars.text.productLg,
  fontWeight: 500,
});
