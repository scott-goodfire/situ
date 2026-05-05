import type { Meta, StoryObj } from "@storybook/react";
import { NowPanel } from "./now-panel";
import {
  completedSession,
  runningExperiment,
  runningSession,
} from "./run-monitor.fixtures";

const meta = {
  title: "Features/Run Monitor/Now Panel",
  component: NowPanel,
} satisfies Meta<typeof NowPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Waiting: Story = {
  args: {
    activeExperiment: undefined,
    latestSession: runningSession,
  },
};

export const RunningExperiment: Story = {
  args: {
    activeExperiment: runningExperiment,
    latestSession: runningSession,
  },
};

export const CompletedSession: Story = {
  args: {
    activeExperiment: undefined,
    latestSession: completedSession,
  },
};
