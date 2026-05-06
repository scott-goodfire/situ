import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "@situ/web-ui";
import { AgentsView, type AgentRow } from "./agents-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof AgentsView> = {
  title: "Pages/Agents",
  component: AgentsView,
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

type Story = StoryObj<typeof AgentsView>;

const AGENTS: AgentRow[] = [
  { id: "agent_001", name: "Research agent", role: "agent", status: "active" },
  { id: "worker_002", name: "Eval worker", role: "worker", status: "active" },
  { id: "worker_003", name: "Replay worker", role: "worker", status: "idle" },
  { id: "agent_004", name: "Stale planner", role: "agent", status: "offline" },
];

export const WithAgents: Story = {
  args: { agents: AGENTS },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="agents" connection={{ kind: "connected" }}>
      <AgentsView {...args} />
    </SituShell>
  ),
};

export const Empty: Story = {
  args: { agents: [] },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="agents" connection={{ kind: "connected" }}>
      <AgentsView {...args} />
    </SituShell>
  ),
};
