import type { Meta, StoryObj } from "@storybook/react-vite";
import { LineageDetailPanel } from "./lineage-detail-panel";
import { narrowStageDecorator } from "./__shared__/decorators";
import {
  buildLineageFixture,
  makeEvaluation,
  makeEvaluationActivity,
  makeExperiment,
  makeExperimentActivity,
  makeHypLink,
  makeHypothesis,
} from "./__shared__/fixtures";

const meta: Meta<typeof LineageDetailPanel> = {
  title: "Lineage/LineageDetailPanel",
  component: LineageDetailPanel,
  parameters: { layout: "fullscreen" },
  decorators: [narrowStageDecorator],
};

export default meta;

type Story = StoryObj<typeof LineageDetailPanel>;

export const NoSelection: Story = {
  args: {
    data: buildLineageFixture(),
    experimentId: undefined,
  },
};

export const Populated: Story = {
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
          thread: "architecture",
          t: 5,
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
