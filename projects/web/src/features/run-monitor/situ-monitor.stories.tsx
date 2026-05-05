import type { Meta, StoryObj } from "@storybook/react";
import { SituMonitor } from "./situ-monitor";
import {
  activeHypothesis,
  activeObjective,
  completedEvents,
  completedExperiments,
  completedSession,
  runningExperimentActivities,
  runningEvents,
  runningExperiments,
  runningSession,
  storyWorkspace,
  suspiciousEvents,
  suspiciousExperimentActivities,
  suspiciousExperiments,
} from "./run-monitor.fixtures";

const meta = {
  title: "Features/Run Monitor/Situ Monitor",
  component: SituMonitor,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SituMonitor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoSession: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "missing" },
    objectives: [],
    sessions: [],
    hypotheses: [],
    experiments: [],
    experimentActivities: [],
    events: [],
  },
};

export const Connecting: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "checking" },
    objectives: [],
    sessions: [],
    hypotheses: [],
    experiments: [],
    experimentActivities: [],
    events: [],
  },
};

export const Running: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "connected" },
    objectives: [activeObjective],
    sessions: [runningSession],
    hypotheses: [activeHypothesis],
    experiments: runningExperiments,
    experimentActivities: runningExperimentActivities,
    events: runningEvents,
  },
};

export const SuspiciousExperiment: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "connected" },
    objectives: [activeObjective],
    sessions: [runningSession],
    hypotheses: [activeHypothesis],
    experiments: suspiciousExperiments,
    experimentActivities: suspiciousExperimentActivities,
    events: suspiciousEvents,
  },
};

export const Completed: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "connected" },
    objectives: [activeObjective],
    sessions: [completedSession],
    hypotheses: [activeHypothesis],
    experiments: completedExperiments,
    experimentActivities: runningExperimentActivities,
    events: completedEvents,
  },
};

export const SessionError: Story = {
  args: {
    workspace: storyWorkspace,
    connection: {
      kind: "failed",
      message: "Lost connection to the local Situ session server.",
    },
    objectives: [activeObjective],
    sessions: [runningSession],
    hypotheses: [activeHypothesis],
    experiments: runningExperiments,
    experimentActivities: runningExperimentActivities,
    events: runningEvents,
  },
};
