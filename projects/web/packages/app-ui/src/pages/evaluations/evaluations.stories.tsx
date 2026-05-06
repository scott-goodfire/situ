import type { EvaluationRecord } from "@situ/protocol";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "@situ/web-ui";
import { EvaluationsView } from "./evaluations-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof EvaluationsView> = {
  title: "Pages/Evaluations",
  component: EvaluationsView,
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

type Story = StoryObj<typeof EvaluationsView>;

const EVALUATIONS: EvaluationRecord[] = [
  {
    id: "eval_0001",
    project_id: "proj_0001",
    status: "closed",
    title: "Baseline support eval",
    summary: "Baseline before candidate changes.",
    associated_experiment_id: null,
    created_at: "2026-01-01T00:02:00Z",
    updated_at: "2026-01-01T00:03:00Z",
  },
  {
    id: "eval_0002",
    project_id: "proj_0001",
    status: "active",
    title: "Retrieval filtering candidate",
    summary: "Candidate measurement for exp_0002.",
    associated_experiment_id: "exp_0002",
    created_at: "2026-01-01T00:05:00Z",
    updated_at: "2026-01-01T00:08:00Z",
  },
  {
    id: "eval_0003",
    project_id: "proj_0001",
    status: "closed",
    title: "Prompt decomposition candidate",
    summary: "Candidate measurement for exp_0003.",
    associated_experiment_id: "exp_0003",
    created_at: "2026-01-01T00:04:00Z",
    updated_at: "2026-01-01T00:06:00Z",
  },
];

export const WithEvaluations: Story = {
  args: { evaluations: EVALUATIONS },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="evaluations" connection={{ kind: "connected" }}>
      <EvaluationsView {...args} />
    </SituShell>
  ),
};

export const Empty: Story = {
  args: { evaluations: [] },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="evaluations" connection={{ kind: "connected" }}>
      <EvaluationsView {...args} />
    </SituShell>
  ),
};
