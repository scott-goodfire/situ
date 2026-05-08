export const MIN_DASHBOARD_WIDTH = 88;
export const MIN_DASHBOARD_HEIGHT = 26;
export const DEFAULT_DASHBOARD_WIDTH = 112;
export const DEFAULT_DASHBOARD_HEIGHT = 34;
export const DASHBOARD_TERMINAL_GUTTER_COLUMNS = 1;
export const MIN_DASHBOARD_TERMINAL_WIDTH =
  MIN_DASHBOARD_WIDTH + DASHBOARD_TERMINAL_GUTTER_COLUMNS;

export type DashboardLayoutMode = "full" | "too-small";

export type DashboardLayout = {
  mode: DashboardLayoutMode;
  terminalWidth: number;
  terminalHeight: number;
  width: number;
  height: number;
  contentWidth: number;
  headerHeight: number;
  countsHeight: number;
  taskBoardHeight: number;
  taskColumnWidths: [number, number, number, number];
  taskRowsPerColumn: number;
  activityHeight: number;
  activityRows: number;
};

export function computeDashboardLayout({
  columns,
  rows,
}: {
  columns: number | undefined;
  rows: number | undefined;
}): DashboardLayout {
  const terminalWidth = Math.max(1, columns ?? DEFAULT_DASHBOARD_WIDTH);
  const terminalHeight = Math.max(1, rows ?? DEFAULT_DASHBOARD_HEIGHT);
  const width = Math.max(1, terminalWidth - DASHBOARD_TERMINAL_GUTTER_COLUMNS);
  const height = terminalHeight;
  const mode =
    terminalWidth < MIN_DASHBOARD_TERMINAL_WIDTH ||
    terminalHeight < MIN_DASHBOARD_HEIGHT
      ? "too-small"
      : "full";
  const contentWidth = Math.max(1, width - 4);
  const headerHeight = 2;
  const countsHeight = 1;
  const chromeRows = 5;
  const sectionRows = Math.max(
    10,
    height - chromeRows - headerHeight - countsHeight,
  );
  const activityHeight = Math.max(5, Math.floor(sectionRows * 0.35));
  const taskBoardHeight = Math.max(5, sectionRows - activityHeight);
  const taskRowsPerColumn = Math.max(3, taskBoardHeight - 1);
  const activityRows = Math.max(3, activityHeight);
  const taskDividerWidth = 6;
  const taskColumnBaseWidth = Math.max(
    10,
    Math.floor((contentWidth - taskDividerWidth) / 4),
  );
  const doneColumnWidth = Math.max(
    10,
    contentWidth - taskDividerWidth - taskColumnBaseWidth * 3,
  );

  return {
    mode,
    terminalWidth,
    terminalHeight,
    width,
    height,
    contentWidth,
    headerHeight,
    countsHeight,
    taskBoardHeight,
    taskColumnWidths: [
      taskColumnBaseWidth,
      taskColumnBaseWidth,
      taskColumnBaseWidth,
      doneColumnWidth,
    ],
    taskRowsPerColumn,
    activityHeight,
    activityRows,
  };
}
