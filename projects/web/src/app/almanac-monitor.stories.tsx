import type { Meta, StoryObj } from "@storybook/react";
import { AlmanacMonitor } from "./almanac-monitor";
import {
  completedEvents,
  completedExperiments,
  completedRun,
  runningEvents,
  runningExperiments,
  runningRun,
  storyWorkspace,
  suspiciousEvents,
  suspiciousExperiments,
} from "../fixtures/story-data";

const meta = {
  title: "App/Almanac Monitor",
  component: AlmanacMonitor,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AlmanacMonitor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoSession: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "missing" },
    runs: [],
    experiments: [],
    events: [],
  },
};

export const Connecting: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "checking" },
    runs: [],
    experiments: [],
    events: [],
  },
};

export const Running: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "connected" },
    runs: [runningRun],
    experiments: runningExperiments,
    events: runningEvents,
  },
};

export const SuspiciousExperiment: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "connected" },
    runs: [runningRun],
    experiments: suspiciousExperiments,
    events: suspiciousEvents,
  },
};

export const Completed: Story = {
  args: {
    workspace: storyWorkspace,
    connection: { kind: "connected" },
    runs: [completedRun],
    experiments: completedExperiments,
    events: completedEvents,
  },
};

export const SessionError: Story = {
  args: {
    workspace: storyWorkspace,
    connection: {
      kind: "failed",
      message: "Lost connection to the local Almanac session server.",
    },
    runs: [runningRun],
    experiments: runningExperiments,
    events: runningEvents,
  },
};
