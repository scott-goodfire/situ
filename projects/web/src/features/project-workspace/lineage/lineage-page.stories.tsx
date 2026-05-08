import type { Meta, StoryObj } from "@storybook/react-vite";
import { LineagePage } from "./lineage-page";
import { pageDecorator } from "./__shared__/decorators";
import { StoryRouter } from "./__shared__/story-router";
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

const meta: Meta<typeof LineagePage> = {
  title: "Lineage/LineagePage",
  component: LineagePage,
  parameters: { layout: "fullscreen" },
  decorators: [
    pageDecorator,
    (Story) => (
      <StoryRouter>
        <Story />
      </StoryRouter>
    ),
  ],
  args: { onSelect: () => {} },
};

export default meta;

type Story = StoryObj<typeof LineagePage>;

const fixture = (() => {
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

export const NoSelection: Story = {
  args: { data: fixture, selectedExperimentId: undefined },
};

export const WithSelection: Story = {
  args: { data: fixture, selectedExperimentId: "EX5" },
};
