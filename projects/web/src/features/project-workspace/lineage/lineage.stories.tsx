import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "@situ/web-ui";
import { LineageDetailPanel } from "./lineage-detail-panel";
import { LineageGraph } from "./lineage-graph";
import { LineageNode } from "./lineage-node";
import { LineagePage } from "./lineage-page";
import {
  buildLineageFixture,
  makeEvaluation,
  makeEvaluationActivity,
  makeExperiment,
  makeExperimentActivity,
  makeFailedExperimentTask,
  makeHypLink,
  makeHypothesis,
} from "./__shared__/fixtures";

const stageDecorator = (Story: React.ComponentType) => (
  <div
    style={{
      minHeight: "100vh",
      padding: 24,
      background: vars.color.stage,
      color: vars.color.foreground,
    }}
  >
    <Story />
  </div>
);

// ---------------------------------------------------------------------------
// LineageNode
// ---------------------------------------------------------------------------

const nodeMeta: Meta<typeof LineageNode> = {
  title: "Lineage/LineageNode",
  component: LineageNode,
  parameters: { layout: "fullscreen" },
  decorators: [stageDecorator],
  args: {
    onSelect: () => {},
  },
};

export default nodeMeta;

type NodeStory = StoryObj<typeof LineageNode>;

export const NodeNeutral: NodeStory = {
  args: {
    experiment: makeExperiment({
      id: "EX1",
      title: "MLP width 64 → 128",
      t: 1,
    }),
    hypothesisIds: ["H1"],
    criticStatus: "pending",
    isSelected: false,
    isFailed: false,
  },
};

export const NodeReviewed: NodeStory = {
  args: {
    experiment: makeExperiment({
      id: "EX2",
      title: "Cosine LR schedule from prior art",
      status: "closed",
      t: 2,
    }),
    hypothesisIds: ["H1", "H3"],
    criticStatus: "reviewed",
    isSelected: false,
    isFailed: false,
  },
};

export const NodeConcern: NodeStory = {
  args: {
    experiment: makeExperiment({
      id: "EX3",
      title: "Aggressive dropout with 4× batch",
      status: "active",
      t: 3,
    }),
    hypothesisIds: ["H2"],
    criticStatus: "concern",
    isSelected: false,
    isFailed: false,
  },
};

export const NodeFailed: NodeStory = {
  args: {
    experiment: makeExperiment({
      id: "EX4",
      title: "Streaming retrieval with stale cache",
      status: "active",
      t: 4,
    }),
    hypothesisIds: ["H4"],
    criticStatus: "pending",
    isSelected: false,
    isFailed: true,
  },
};

export const NodeSelected: NodeStory = {
  args: {
    experiment: makeExperiment({
      id: "EX5",
      title: "Train longer with cosine LR + EMA",
      status: "closed",
      t: 5,
    }),
    hypothesisIds: ["H1", "H3", "H5"],
    criticStatus: "reviewed",
    isSelected: true,
    isFailed: false,
  },
};

// ---------------------------------------------------------------------------
// LineageGraph
// ---------------------------------------------------------------------------

const graphMeta: Meta<typeof LineageGraph> = {
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

type GraphStory = StoryObj<typeof LineageGraph>;

export const GraphEmpty: GraphStory = {
  ...graphMeta,
  args: {
    ...graphMeta.args,
    data: buildLineageFixture(),
  },
};

GraphEmpty.storyName = "Empty";

export const GraphLinear: GraphStory = {
  ...graphMeta,
  args: {
    ...graphMeta.args,
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

GraphLinear.storyName = "Linear chain";

export const GraphFork: GraphStory = {
  ...graphMeta,
  args: {
    ...graphMeta.args,
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
          body: "Critic: clean improvement, no concerns.",
          activityType: "critic_review",
          t: 2,
        }),
        makeExperimentActivity({
          experimentId: "EX3",
          body: "Critic: rejected — confounder identified.",
          activityType: "concern",
          t: 3,
        }),
      ],
    }),
  },
};

GraphFork.storyName = "Branching tree";

export const GraphMultiRoot: GraphStory = {
  ...graphMeta,
  args: {
    ...graphMeta.args,
    data: buildLineageFixture({
      experiments: [
        makeExperiment({
          id: "EX1",
          title: "Architecture probe (thread A)",
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
          title: "Optimization probe (thread B)",
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
          title: "EX2 + cosine LR (combined)",
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

GraphMultiRoot.storyName = "Multiple roots / threads";

export const GraphMixedStates: GraphStory = (() => {
  const failed = makeFailedExperimentTask({ id: "T9", experimentId: "EX3" });
  return {
    ...graphMeta,
    args: {
      ...graphMeta.args,
      selectedExperimentId: "EX5",
      failedExperimentIds: new Set(["EX3"]),
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
            body: "Approved with caveat about var on small batches.",
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

GraphMixedStates.storyName = "Mixed states (concern + failure + selected)";

// ---------------------------------------------------------------------------
// LineageDetailPanel
// ---------------------------------------------------------------------------

const panelMeta: Meta<typeof LineageDetailPanel> = {
  title: "Lineage/LineageDetailPanel",
  component: LineageDetailPanel,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          background: vars.color.stage,
          color: vars.color.foreground,
          maxWidth: 480,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

type PanelStory = StoryObj<typeof LineageDetailPanel>;

export const PanelEmpty: PanelStory = {
  ...panelMeta,
  args: {
    data: buildLineageFixture(),
    experimentId: undefined,
  },
};

PanelEmpty.storyName = "Placeholder (no selection)";

export const PanelPopulated: PanelStory = {
  ...panelMeta,
  args: {
    experimentId: "EX5",
    data: buildLineageFixture({
      experiments: [
        makeExperiment({ id: "EX4", title: "Wider MLP + dropout", status: "closed", t: 4 }),
        makeExperiment({
          id: "EX5",
          parentId: "EX4",
          title: "Cosine LR + EMA",
          summary:
            "Combine the EX4 architecture with cosine LR scheduling and an EMA on weights to test whether the gain compounds.",
          baseCommit: "a3f2e1c4d5b67890",
          candidateCommit: "9d8c7b6a5e4f3210",
          status: "closed",
          t: 5,
          thread: "architecture",
        }),
      ],
      hypotheses: [
        makeHypothesis({
          id: "H1",
          title: "Capacity bottleneck",
          summary: "MLP width is too small for the problem complexity.",
        }),
        makeHypothesis({
          id: "H3",
          title: "LR schedule matters",
          summary: "Cosine annealing avoids late-stage thrashing.",
        }),
      ],
      hypothesisExperimentLinks: [
        makeHypLink({ hypothesisId: "H1", experimentId: "EX5" }),
        makeHypLink({ hypothesisId: "H3", experimentId: "EX5" }),
      ],
      evaluations: [
        makeEvaluation({
          id: "EV5a",
          experimentId: "EX5",
          title: "Dev accuracy",
          t: 5,
        }),
        makeEvaluation({
          id: "EV5b",
          experimentId: "EX5",
          title: "Held-out accuracy",
          t: 5,
        }),
      ],
      evaluationActivities: [
        makeEvaluationActivity({
          evaluationId: "EV5a",
          body: "acc=0.701, +0.016 vs EX4",
          t: 5,
        }),
        makeEvaluationActivity({
          evaluationId: "EV5b",
          body: "acc=0.689, +0.012 vs EX4",
          t: 5,
        }),
      ],
      experimentActivities: [
        makeExperimentActivity({
          experimentId: "EX5",
          body: "Critic: best result so far in this thread, low variance across seeds.",
          activityType: "critic_review",
          t: 5,
        }),
      ],
    }),
  },
};

PanelPopulated.storyName = "With selection";

// ---------------------------------------------------------------------------
// Full LineagePage
// ---------------------------------------------------------------------------

const pageMeta: Meta<typeof LineagePage> = {
  title: "Lineage/LineagePage",
  component: LineagePage,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: "100vh",
          padding: "0 28px",
          background: vars.color.stage,
          color: vars.color.foreground,
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    onSelect: () => {},
  },
};

type PageStory = StoryObj<typeof LineagePage>;

const fullProjectFixture = (() => {
  const failed = makeFailedExperimentTask({ id: "T9", experimentId: "EX3" });
  return buildLineageFixture({
    experiments: [
      makeExperiment({
        id: "EX1",
        title: "Baseline run",
        summary: "Stock training recipe at 64-dim MLP.",
        status: "closed",
        baseCommit: "a3f2e1c4d5b67890",
        candidateCommit: "a3f2e1c4d5b67890",
        t: 1,
      }),
      makeExperiment({
        id: "EX2",
        parentId: "EX1",
        title: "MLP width 64 → 128",
        summary: "Doubled hidden dim to test capacity hypothesis.",
        status: "closed",
        baseCommit: "a3f2e1c4d5b67890",
        candidateCommit: "b2e3f4a5b6c70809",
        t: 2,
      }),
      makeExperiment({
        id: "EX3",
        parentId: "EX1",
        title: "Aggressive dropout",
        summary: "Probe regularization hypothesis directly from baseline.",
        status: "active",
        baseCommit: "a3f2e1c4d5b67890",
        candidateCommit: "c4d5e6f7a8b90c1d",
        t: 3,
      }),
      makeExperiment({
        id: "EX4",
        parentId: "EX2",
        title: "EX2 + dropout",
        summary: "Combine width with light dropout.",
        status: "closed",
        baseCommit: "b2e3f4a5b6c70809",
        candidateCommit: "d5e6f7a8b9c0d1e2",
        t: 4,
      }),
      makeExperiment({
        id: "EX5",
        parentId: "EX4",
        title: "EX4 + cosine LR + EMA",
        summary: "Stack scheduler and EMA on the best-so-far candidate.",
        status: "closed",
        baseCommit: "d5e6f7a8b9c0d1e2",
        candidateCommit: "e6f7a8b9c0d1e2f3",
        t: 5,
      }),
      makeExperiment({
        id: "EX6",
        parentId: "EX2",
        title: "Wider MLP + label smoothing",
        summary: "Alternate regularization on the EX2 spine.",
        status: "active",
        t: 6,
      }),
    ],
    hypotheses: [
      makeHypothesis({ id: "H1", title: "Capacity bottleneck" }),
      makeHypothesis({ id: "H2", title: "Regularization story" }),
      makeHypothesis({ id: "H3", title: "LR schedule matters" }),
    ],
    hypothesisExperimentLinks: [
      makeHypLink({ hypothesisId: "H1", experimentId: "EX2" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX3" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX4" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX4" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX5" }),
      makeHypLink({ hypothesisId: "H3", experimentId: "EX5" }),
      makeHypLink({ hypothesisId: "H1", experimentId: "EX6" }),
      makeHypLink({ hypothesisId: "H2", experimentId: "EX6" }),
    ],
    evaluations: [
      makeEvaluation({ id: "EV5a", experimentId: "EX5", title: "Dev accuracy", t: 5 }),
      makeEvaluation({ id: "EV5b", experimentId: "EX5", title: "Held-out accuracy", t: 5 }),
    ],
    evaluationActivities: [
      makeEvaluationActivity({
        evaluationId: "EV5a",
        body: "acc=0.701, +0.016 vs EX4",
        t: 5,
      }),
      makeEvaluationActivity({
        evaluationId: "EV5b",
        body: "acc=0.689, +0.012 vs EX4",
        t: 5,
      }),
    ],
    experimentActivities: [
      makeExperimentActivity({
        experimentId: "EX2",
        body: "Approved by Critic.",
        activityType: "critic_review",
        t: 2,
      }),
      makeExperimentActivity({
        experimentId: "EX4",
        body: "Approved with note about late-epoch variance.",
        activityType: "critic_review",
        t: 4,
      }),
      makeExperimentActivity({
        experimentId: "EX5",
        body: "Critic: best in thread; clean reproductions.",
        activityType: "critic_review",
        t: 5,
      }),
      makeExperimentActivity({
        experimentId: "EX3",
        body: "Concern: result depends on dropout rate sweep that wasn't fully resolved.",
        activityType: "concern",
        t: 3,
      }),
    ],
    tasks: [failed.task],
    taskEntityLinks: [failed.link],
  });
})();

export const PageOverview: PageStory = {
  ...pageMeta,
  args: {
    ...pageMeta.args,
    data: fullProjectFixture,
    selectedExperimentId: undefined,
  },
};

PageOverview.storyName = "Page (no selection)";

export const PageWithSelection: PageStory = {
  ...pageMeta,
  args: {
    ...pageMeta.args,
    data: fullProjectFixture,
    selectedExperimentId: "EX5",
  },
};

PageWithSelection.storyName = "Page (EX5 selected)";
