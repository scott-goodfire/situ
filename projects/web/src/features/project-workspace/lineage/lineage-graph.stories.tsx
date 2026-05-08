import type { Meta, StoryObj } from "@storybook/react-vite";
import { LineageGraph } from "./lineage-graph";
import { stageDecorator } from "./__shared__/decorators";
import {
  buildLineageFixture,
  buildLongRunFixture,
  buildWideBranchFixture,
  makeExperiment,
  makeExperimentActivity,
  makeFailedExperimentTask,
  makeHypLink,
  makeHypothesis,
} from "./__shared__/fixtures";

const meta: Meta<typeof LineageGraph> = {
  title: "Lineage/LineageGraph",
  component: LineageGraph,
  parameters: { layout: "fullscreen" },
  decorators: [stageDecorator],
  args: {
    selectedExperimentId: undefined,
    failedExperimentIds: new Set<string>(),
    onSelect: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof LineageGraph>;

export const Empty: Story = {
  args: { data: buildLineageFixture() },
};

export const LinearChain: Story = {
  args: {
    data: buildLineageFixture({
      experiments: [
        makeExperiment({ id: "EX1", title: "Baseline", status: "closed", t: 1 }),
        makeExperiment({
          id: "EX2",
          parentId: "EX1",
          title: "Increase MLP width",
          status: "closed",
          t: 2,
        }),
        makeExperiment({
          id: "EX3",
          parentId: "EX2",
          title: "Add dropout regularization",
          status: "closed",
          t: 3,
        }),
        makeExperiment({
          id: "EX4",
          parentId: "EX3",
          title: "Cosine LR schedule",
          status: "active",
          t: 4,
        }),
      ],
      hypotheses: [makeHypothesis({ id: "H1", title: "Capacity bottleneck" })],
      hypothesisExperimentLinks: [
        makeHypLink({ hypothesisId: "H1", experimentId: "EX2" }),
        makeHypLink({ hypothesisId: "H1", experimentId: "EX3" }),
        makeHypLink({ hypothesisId: "H1", experimentId: "EX4" }),
      ],
      experimentActivities: [
        makeExperimentActivity({
          experimentId: "EX2",
          body: "Approved by Critic.",
          activityType: "critic_review",
          t: 2,
        }),
        makeExperimentActivity({
          experimentId: "EX3",
          body: "Approved by Critic.",
          activityType: "critic_review",
          t: 3,
        }),
      ],
    }),
  },
};

export const BranchingTree: Story = {
  args: {
    data: buildLineageFixture({
      experiments: [
        makeExperiment({ id: "EX1", title: "Baseline", status: "closed", t: 1 }),
        makeExperiment({
          id: "EX2",
          parentId: "EX1",
          title: "Increase MLP width",
          status: "closed",
          t: 2,
        }),
        makeExperiment({
          id: "EX3",
          parentId: "EX1",
          title: "Try learning rate sweep",
          status: "closed",
          t: 3,
        }),
        makeExperiment({
          id: "EX4",
          parentId: "EX2",
          title: "EX2 + dropout",
          status: "active",
          t: 4,
        }),
        makeExperiment({
          id: "EX5",
          parentId: "EX2",
          title: "EX2 + cosine LR",
          status: "active",
          t: 5,
        }),
      ],
      hypotheses: [
        makeHypothesis({ id: "H1", title: "Capacity bottleneck" }),
        makeHypothesis({ id: "H2", title: "Optimization too aggressive" }),
      ],
      hypothesisExperimentLinks: [
        makeHypLink({ hypothesisId: "H1", experimentId: "EX2" }),
        makeHypLink({ hypothesisId: "H2", experimentId: "EX3" }),
        makeHypLink({ hypothesisId: "H1", experimentId: "EX4" }),
        makeHypLink({ hypothesisId: "H1", experimentId: "EX5" }),
      ],
      experimentActivities: [
        makeExperimentActivity({
          experimentId: "EX2",
          body: "Critic: clean improvement.",
          activityType: "critic_review",
          t: 2,
        }),
        makeExperimentActivity({
          experimentId: "EX3",
          body: "Critic: rejected — confounder.",
          activityType: "concern",
          t: 3,
        }),
      ],
    }),
  },
};

export const MultipleRoots: Story = {
  args: {
    data: buildLineageFixture({
      experiments: [
        makeExperiment({
          id: "EX1",
          title: "Architecture probe",
          thread: "architecture",
          status: "closed",
          t: 1,
        }),
        makeExperiment({
          id: "EX2",
          parentId: "EX1",
          title: "Wider MLP",
          thread: "architecture",
          status: "closed",
          t: 2,
        }),
        makeExperiment({
          id: "EX3",
          title: "Optimization probe",
          thread: "optimization",
          status: "closed",
          t: 3,
        }),
        makeExperiment({
          id: "EX4",
          parentId: "EX3",
          title: "Cosine LR + warmup",
          thread: "optimization",
          status: "active",
          t: 4,
        }),
        makeExperiment({
          id: "EX5",
          parentId: "EX2",
          title: "EX2 + cosine LR",
          thread: "architecture",
          status: "active",
          t: 5,
        }),
      ],
      hypotheses: [
        makeHypothesis({ id: "H1", title: "Capacity bottleneck" }),
        makeHypothesis({ id: "H2", title: "Optimizer schedule" }),
      ],
      hypothesisExperimentLinks: [
        makeHypLink({ hypothesisId: "H1", experimentId: "EX2" }),
        makeHypLink({ hypothesisId: "H2", experimentId: "EX4" }),
        makeHypLink({ hypothesisId: "H1", experimentId: "EX5" }),
        makeHypLink({ hypothesisId: "H2", experimentId: "EX5" }),
      ],
    }),
  },
};

export const LongRun: Story = {
  args: {
    selectedExperimentId: "EX10",
    failedExperimentIds: new Set(["EX3"]),
    onSelect: () => {},
    data: buildLongRunFixture(),
  },
};

export const WideBranches: Story = {
  args: {
    selectedExperimentId: "EX12",
    failedExperimentIds: new Set(["EX8"]),
    onSelect: () => {},
    data: buildWideBranchFixture(),
  },
};

export const MixedStates: Story = (() => {
  const failed = makeFailedExperimentTask({ id: "T9", experimentId: "EX3" });
  return {
    args: {
      selectedExperimentId: "EX5",
      failedExperimentIds: new Set(["EX3"]),
      onSelect: () => {},
      data: buildLineageFixture({
        experiments: [
          makeExperiment({ id: "EX1", title: "Baseline", status: "closed", t: 1 }),
          makeExperiment({
            id: "EX2",
            parentId: "EX1",
            title: "Wider MLP",
            status: "closed",
            t: 2,
          }),
          makeExperiment({
            id: "EX3",
            parentId: "EX1",
            title: "Aggressive dropout",
            status: "active",
            t: 3,
          }),
          makeExperiment({
            id: "EX4",
            parentId: "EX2",
            title: "Wider MLP + dropout",
            status: "closed",
            t: 4,
          }),
          makeExperiment({
            id: "EX5",
            parentId: "EX4",
            title: "Cosine LR + EMA",
            status: "active",
            t: 5,
          }),
        ],
        hypotheses: [
          makeHypothesis({ id: "H1", title: "Capacity bottleneck" }),
          makeHypothesis({ id: "H2", title: "Regularization story" }),
        ],
        hypothesisExperimentLinks: [
          makeHypLink({ hypothesisId: "H1", experimentId: "EX2" }),
          makeHypLink({ hypothesisId: "H2", experimentId: "EX3" }),
          makeHypLink({ hypothesisId: "H1", experimentId: "EX4" }),
          makeHypLink({ hypothesisId: "H2", experimentId: "EX4" }),
          makeHypLink({ hypothesisId: "H1", experimentId: "EX5" }),
        ],
        experimentActivities: [
          makeExperimentActivity({
            experimentId: "EX2",
            body: "Approved.",
            activityType: "critic_review",
            t: 2,
          }),
          makeExperimentActivity({
            experimentId: "EX4",
            body: "Approved with caveat about late-epoch variance.",
            activityType: "critic_review",
            t: 4,
          }),
          makeExperimentActivity({
            experimentId: "EX5",
            body: "Concern: result depends on warmup length.",
            activityType: "concern",
            t: 5,
          }),
        ],
        tasks: [failed.task],
        taskEntityLinks: [failed.link],
      }),
    },
  };
})();
