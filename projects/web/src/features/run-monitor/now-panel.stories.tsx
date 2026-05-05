import type { Meta, StoryObj } from "@storybook/react";
import { NowPanel } from "./now-panel";
import { completedRun, runningExperiment, runningRun } from "./run-monitor.fixtures";

const meta = {
  title: "Features/Run Monitor/Now Panel",
  component: NowPanel,
} satisfies Meta<typeof NowPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Waiting: Story = {
  args: {
    activeExperiment: undefined,
    latestRun: runningRun,
  },
};

export const RunningExperiment: Story = {
  args: {
    activeExperiment: runningExperiment,
    latestRun: runningRun,
  },
};

export const CompletedRun: Story = {
  args: {
    activeExperiment: undefined,
    latestRun: completedRun,
  },
};
