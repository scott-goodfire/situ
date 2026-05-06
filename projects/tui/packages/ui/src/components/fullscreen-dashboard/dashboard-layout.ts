export const MIN_DASHBOARD_WIDTH = 88;
export const MIN_DASHBOARD_HEIGHT = 26;
export const DEFAULT_DASHBOARD_WIDTH = 112;
export const DEFAULT_DASHBOARD_HEIGHT = 34;

export type DashboardLayoutMode = "full" | "too-small";

export type DashboardLayout = {
  mode: DashboardLayoutMode;
  width: number;
  height: number;
  contentWidth: number;
  headerHeight: number;
  countsHeight: number;
  taskBoardHeight: number;
  taskColumnWidths: [number, number, number];
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
  const width = Math.max(1, columns ?? DEFAULT_DASHBOARD_WIDTH);
  const height = Math.max(1, rows ?? DEFAULT_DASHBOARD_HEIGHT);
  const mode =
    width < MIN_DASHBOARD_WIDTH || height < MIN_DASHBOARD_HEIGHT
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
  const taskDividerWidth = 4;
  const taskColumnBaseWidth = Math.max(
    12,
    Math.floor((contentWidth - taskDividerWidth) / 3),
  );
  const doneColumnWidth = Math.max(
    12,
    contentWidth - taskDividerWidth - taskColumnBaseWidth * 2,
  );

  return {
    mode,
    width,
    height,
    contentWidth,
    headerHeight,
    countsHeight,
    taskBoardHeight,
    taskColumnWidths: [
      taskColumnBaseWidth,
      taskColumnBaseWidth,
      doneColumnWidth,
    ],
    taskRowsPerColumn,
    activityHeight,
    activityRows,
  };
}
