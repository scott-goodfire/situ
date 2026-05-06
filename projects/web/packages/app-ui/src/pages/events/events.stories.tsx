import type { EventRecord } from "@situ/protocol";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "@situ/web-ui";
import { EventsView } from "./events-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof EventsView> = {
  title: "Pages/Events",
  component: EventsView,
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

type Story = StoryObj<typeof EventsView>;

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
    type: "hypothesis.create",
    message: "Created hypothesis hyp_0001",
    created_at: "2026-01-01T00:01:00Z",
  },
  {
    id: 3,
    session_id: "session_0001",
    type: "experiment.start",
    message: "Started experiment exp_0002",
    created_at: "2026-01-01T00:04:00Z",
  },
  {
    id: 4,
    session_id: "session_0001",
    type: "evaluation.complete",
    message: "Eval eval_0002 completed: resolution_rate 64.8%",
    created_at: "2026-01-01T00:08:00Z",
  },
];

export const WithEvents: Story = {
  args: { events: EVENTS },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="events" connection={{ kind: "connected" }}>
      <EventsView {...args} />
    </SituShell>
  ),
};

export const Empty: Story = {
  args: { events: [] },
  render: (args) => (
    <SituShell workspace="support-agent-demo" activeNav="events" connection={{ kind: "connected" }}>
      <EventsView {...args} />
    </SituShell>
  ),
};
