import type { Meta, StoryObj } from "@storybook/react-vite";
import { vars } from "@situ/web-ui";
import {
  ProjectIndexView,
  type ProjectIndexViewProject,
} from "./project-index-view";
import { SituShell } from "../../shell/situ-shell";

const meta: Meta<typeof ProjectIndexView> = {
  title: "Pages/ProjectIndex",
  component: ProjectIndexView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", padding: 16, background: vars.color.stage }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    mode: {
      control: { type: "select" },
      options: ["ready", "checking", "empty", "error"],
    },
  },
};

export default meta;

type Story = StoryObj<typeof ProjectIndexView>;

const PROJECTS: ProjectIndexViewProject[] = [
  {
    id: "support-agent-demo",
    label: "Support agent demo",
    workspace: "/Users/situ/sandbox/support-agent",
    objective: "Improve support-agent resolution",
    status: "running",
    lastSeen: "2026-04-30T10:42:00Z",
  },
  {
    id: "rag-experiments",
    label: "RAG experiments",
    workspace: "/Users/situ/work/rag",
    objective: "Reduce hallucination rate to <2%",
    status: "stale",
    statusReason: "Heartbeat older than 12m",
    lastSeen: "2026-04-30T08:18:00Z",
  },
  {
    id: "billing-router",
    label: "Billing router research",
    workspace: "/Users/situ/work/billing",
    objective: null,
    status: "stopped",
    lastSeen: "2026-04-29T22:05:00Z",
  },
  {
    id: "missing-ws",
    label: "Schema migration",
    workspace: null,
    objective: "Schema v3 migration safety",
    status: "missing_workspace",
    lastSeen: "2026-04-30T01:11:00Z",
  },
];

export const WithProjects: Story = {
  args: {
    projects: PROJECTS,
    mode: "ready",
  },
  render: (args) => (
    <SituShell workspace="local-dev" connection={{ kind: "connected" }}>
      <ProjectIndexView {...args} />
    </SituShell>
  ),
};

export const Empty: Story = {
  args: {
    projects: [],
    mode: "empty",
  },
  render: (args) => (
    <SituShell workspace="local-dev" connection={{ kind: "connected" }}>
      <ProjectIndexView {...args} />
    </SituShell>
  ),
};

export const Checking: Story = {
  args: {
    projects: [],
    mode: "checking",
  },
  render: (args) => (
    <SituShell workspace="local-dev" connection={{ kind: "checking" }}>
      <ProjectIndexView {...args} />
    </SituShell>
  ),
};

export const Error: Story = {
  args: {
    projects: [],
    mode: "error",
    errorMessage: "Could not reach the discovery API at 127.0.0.1:7771",
  },
  render: (args) => (
    <SituShell workspace="local-dev" connection={{ kind: "failed", message: "API down" }}>
      <ProjectIndexView {...args} />
    </SituShell>
  ),
};
