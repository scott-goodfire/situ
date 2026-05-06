import type { ExperimentRecord } from "@situ/protocol";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "@situ/web-ui";
import { ExperimentsView } from "./experiments-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof ExperimentsView> = {
  title: "Pages/Experiments",
  component: ExperimentsView,
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

type Story = StoryObj<typeof ExperimentsView>;

const EXPERIMENTS: ExperimentRecord[] = [
  {
    id: "exp_0001",
    session_id: "session_0001",
    status: "closed",
    title: "Baseline support eval",
    summary: "Recorded native support-agent eval output before changing behavior.",
    created_at: "2026-01-01T00:02:00Z",
    updated_at: "2026-01-01T00:03:00Z",
  },
  {
    id: "exp_0002",
    session_id: "session_0001",
    status: "active",
    title: "Try retrieval filtering",
    summary: "Filter snippets below the confidence floor on cancellation tickets.",
    created_at: "2026-01-01T00:04:00Z",
    updated_at: "2026-01-01T00:08:00Z",
  },
  {
    id: "exp_0003",
    session_id: "session_0001",
    status: "open",
    title: "Try prompt decomposition",
    summary: "Split billing prompt into identify, plan, and answer steps.",
    created_at: "2026-01-01T00:03:00Z",
    updated_at: "2026-01-01T00:06:00Z",
  },
];

export const WithExperiments: Story = {
  args: { experiments: EXPERIMENTS },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="experiments" connection={{ kind: "connected" }}>
      <ExperimentsView {...args} />
    </SituShell>
  ),
};

export const Empty: Story = {
  args: { experiments: [] },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="experiments" connection={{ kind: "connected" }}>
      <ExperimentsView {...args} />
    </SituShell>
  ),
};
