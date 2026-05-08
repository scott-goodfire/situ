import { expect, test } from "bun:test";
import {
  computeDashboardLayout,
  DASHBOARD_TERMINAL_GUTTER_COLUMNS,
  MIN_DASHBOARD_TERMINAL_WIDTH,
  MIN_DASHBOARD_WIDTH,
} from "./dashboard-layout.js";

test("computeDashboardLayout reserves a right-side terminal gutter", () => {
  const layout = computeDashboardLayout({
    columns: 120,
    rows: 34,
  });

  expect(layout.mode).toBe("full");
  expect(layout.terminalWidth).toBe(120);
  expect(layout.width).toBe(120 - DASHBOARD_TERMINAL_GUTTER_COLUMNS);
});

test("computeDashboardLayout requires enough terminal columns for the gutter", () => {
  expect(
    computeDashboardLayout({
      columns: MIN_DASHBOARD_TERMINAL_WIDTH,
      rows: 34,
    }).mode,
  ).toBe("full");
  expect(
    computeDashboardLayout({
      columns: MIN_DASHBOARD_WIDTH,
      rows: 34,
    }).mode,
  ).toBe("too-small");
});

test("computeDashboardLayout keeps task columns inside the content width", () => {
  const layout = computeDashboardLayout({
    columns: 120,
    rows: 34,
  });
  const [triageWidth, backlogWidth, inProgressWidth, doneWidth] =
    layout.taskColumnWidths;

  expect(triageWidth + backlogWidth + inProgressWidth + doneWidth + 6).toBe(
    layout.contentWidth,
  );
});
