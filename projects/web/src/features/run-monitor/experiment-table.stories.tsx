import type { Meta, StoryObj } from "@storybook/react";
import { ExperimentTable } from "./experiment-table";
import { runningExperiments, suspiciousExperiments } from "./run-monitor.fixtures";

const meta = {
  title: "Features/Run Monitor/Experiment Table",
  component: ExperimentTable,
} satisfies Meta<typeof ExperimentTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    experiments: [],
  },
};

export const Running: Story = {
  args: {
    experiments: runningExperiments,
  },
};

export const WithSuspiciousExperiment: Story = {
  args: {
    experiments: suspiciousExperiments,
  },
};
