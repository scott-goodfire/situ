import type { Meta, StoryObj } from "@storybook/react";
import { RunSummary } from "./run-summary";
import { completedRun, runningRun } from "./run-monitor.fixtures";

const meta = {
  title: "Features/Run Monitor/Run Summary",
  component: RunSummary,
} satisfies Meta<typeof RunSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoRun: Story = {
  args: {
    run: undefined,
    experimentCount: 0,
  },
};

export const Running: Story = {
  args: {
    run: runningRun,
    experimentCount: 3,
  },
};

export const Completed: Story = {
  args: {
    run: completedRun,
    experimentCount: 2,
  },
};
