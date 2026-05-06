import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "@situ/web-ui";
import {
  OverviewPageView,
  type OverviewHypothesis,
} from "./overview-page-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof OverviewPageView> = {
  title: "Pages/Overview",
  component: OverviewPageView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", padding: 16, background: vars.color.stage }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof OverviewPageView>;

const FULL_HYPOTHESES: OverviewHypothesis[] = [
  {
    id: "hyp_0002",
    title: "Tool-use discipline reduces billing detours",
    status: "open",
    summary:
      "Require account lookup before offering cancellation or refund guidance.",
    evidence: "No active work yet",
  },
  {
    id: "hyp_0001",
    title: "Filtering low-confidence retrieval helps cancellation tickets",
    status: "active",
    summary:
      "Drop weak snippets before tool calls so the agent cites fewer irrelevant policies.",
    agents: "agent / 1 experiment",
    evidence:
      "Evidence: Candidate: resolution_rate 64.8%, latency 1910ms. Needs reproduction before treating as accepted.",
    experimentLabel: "Try retrieval filtering",
  },
  {
    id: "hyp_0003",
    title: "Prompt decomposition is saturated",
    status: "closed",
    summary: "Further prompt decomposition did not improve the billing slice.",
    agents: "agent + worker / 1 experiment",
    evidence:
      "Evidence: Candidate: resolution_rate 60.8%, latency 1860ms. Closed as unpromising.",
    experimentLabel: "Try prompt decomposition",
  },
];

export const RunningWithEvidence: Story = {
  args: { hypotheses: FULL_HYPOTHESES },
  render: (args) => (
    <SituShell
      workspace="support-agent-demo"
      activeNav="overview"
      connection={{ kind: "connected" }}
    >
      <OverviewPageView {...args} />
    </SituShell>
  ),
};

export const FreshProject: Story = {
  args: { hypotheses: [] },
  render: (args) => (
    <SituShell workspace="new-project" activeNav="overview" connection={{ kind: "connected" }}>
      <OverviewPageView {...args} />
    </SituShell>
  ),
};

export const SparseProject: Story = {
  args: {
    hypotheses: [
      {
        id: "hyp_0001",
        title: "Initial guess: prompt is too verbose",
        status: "open",
        summary: "Smaller prompts may improve latency without hurting accuracy.",
      },
    ],
  },
  render: (args) => (
    <SituShell
      workspace="early-project"
      activeNav="overview"
      connection={{ kind: "connected" }}
    >
      <OverviewPageView {...args} />
    </SituShell>
  ),
};
