import type { Meta, StoryObj } from "@storybook/react";
import { RunSummary } from "./run-summary";
import {
  activeObjective,
  completedSession,
  runningSession,
} from "./run-monitor.fixtures";

const meta = {
  title: "Features/Run Monitor/Run Summary",
  component: RunSummary,
} satisfies Meta<typeof RunSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoSession: Story = {
  args: {
    objective: activeObjective,
    session: undefined,
    experimentCount: 0,
    hypothesisCount: 0,
  },
};

export const Running: Story = {
  args: {
    objective: activeObjective,
    session: runningSession,
    experimentCount: 3,
    hypothesisCount: 1,
  },
};

export const Completed: Story = {
  args: {
    objective: activeObjective,
    session: completedSession,
    experimentCount: 2,
    hypothesisCount: 1,
  },
};
