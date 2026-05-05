import type {
  EventRecord,
  ExperimentRecord,
  HypothesisRecord,
  SessionRecord,
} from "@situ/protocol";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RunMonitorView } from "./run-monitor-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof RunMonitorView> = {
  title: "Pages/RunMonitor",
  component: RunMonitorView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", padding: 16, background: "var(--stage)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RunMonitorView>;

const SESSION: SessionRecord = {
  id: "session_0001",
  project_id: "support-agent-demo",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:08:00Z",
};

const HYPOTHESES: HypothesisRecord[] = [
  {
    id: "hyp_0001",
    session_id: "session_0001",
    title: "Filtering low-confidence retrieval helps cancellation tickets",
    summary: "Drop weak snippets before tool calls.",
    status: "active",
    created_at: "2026-01-01T00:01:00Z",
    updated_at: "2026-01-01T00:08:00Z",
  },
  {
    id: "hyp_0002",
    session_id: "session_0001",
    title: "Tool-use discipline reduces billing detours",
    summary: "Require account lookup before refund.",
    status: "open",
    created_at: "2026-01-01T00:02:00Z",
    updated_at: "2026-01-01T00:04:00Z",
  },
];

const EXPERIMENTS: ExperimentRecord[] = [
  {
    id: "exp_0002",
    session_id: "session_0001",
    status: "active",
    title: "Try retrieval filtering",
    summary: "Filter low-confidence snippets.",
    created_at: "2026-01-01T00:04:00Z",
    updated_at: "2026-01-01T00:08:00Z",
  },
];

const EVENTS: EventRecord[] = [
  {
    id: 1,
    session_id: "session_0001",
    type: "session.start",
    message: "Session started",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    session_id: "session_0001",
    type: "experiment.start",
    message: "Started experiment exp_0002",
    created_at: "2026-01-01T00:04:00Z",
  },
];

export const Live: Story = {
  args: {
    session: SESSION,
    hypotheses: HYPOTHESES,
    experiments: EXPERIMENTS,
    events: EVENTS,
  },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="overview" connection={{ kind: "connected" }}>
      <RunMonitorView {...args} />
    </SituShell>
  ),
};

export const NoSession: Story = {
  args: {
    hypotheses: [],
    experiments: [],
    events: [],
  },
  render: (args) => (
    <SituShell workspace="support-agent-demo" connection={{ kind: "checking" }}>
      <RunMonitorView {...args} />
    </SituShell>
  ),
};
