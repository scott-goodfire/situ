import type { HypothesisRecord } from "@situ/protocol";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "@situ/web-ui";
import { HypothesesView } from "./hypotheses-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof HypothesesView> = {
  title: "Pages/Hypotheses",
  component: HypothesesView,
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

type Story = StoryObj<typeof HypothesesView>;

const HYPOTHESES: HypothesisRecord[] = [
  {
    id: "hyp_0001",
    session_id: "session_0001",
    title: "Filtering low-confidence retrieval helps cancellation tickets",
    summary: "Drop weak snippets before tool calls so the agent cites fewer irrelevant policies.",
    status: "active",
    created_at: "2026-01-01T00:01:00Z",
    updated_at: "2026-01-01T00:08:00Z",
  },
  {
    id: "hyp_0002",
    session_id: "session_0001",
    title: "Tool-use discipline reduces billing detours",
    summary: "Require account lookup before offering cancellation or refund guidance.",
    status: "open",
    created_at: "2026-01-01T00:02:00Z",
    updated_at: "2026-01-01T00:04:00Z",
  },
  {
    id: "hyp_0003",
    session_id: "session_0001",
    title: "Prompt decomposition is saturated",
    summary: "Further prompt decomposition did not improve the billing slice.",
    status: "closed",
    created_at: "2026-01-01T00:01:30Z",
    updated_at: "2026-01-01T00:06:00Z",
  },
];

export const WithHypotheses: Story = {
  args: { hypotheses: HYPOTHESES },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="hypotheses" connection={{ kind: "connected" }}>
      <HypothesesView {...args} />
    </SituShell>
  ),
};

export const Empty: Story = {
  args: { hypotheses: [] },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="hypotheses" connection={{ kind: "connected" }}>
      <HypothesesView {...args} />
    </SituShell>
  ),
};
