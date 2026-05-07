import type { Meta, StoryObj } from "@storybook/react";
import { AppShell, type AppShellProject } from "../../../app/app-shell";
import type { ProjectWorkspaceData } from "../types";
import { OverviewPage } from "./overview-page";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useMemo } from "react";

function storyAppShellProject({ data }: { data: ProjectWorkspaceData }): AppShellProject {
  return {
    projectId: data.projectId,
    workspace: data.workspace,
    connection: data.connection,
  };
}

const meta = {
  title: "Features/Project Workspace/Overview",
  component: OverviewStory,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof OverviewStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RunningWithEvidence: Story = {
  args: {
    data: overviewData(),
  },
};

function OverviewStory({
  data,
}: {
  data: ProjectWorkspaceData;
}) {
  const router = useMemo(
    () =>
      createStoryRouter({
        data,
      }),
    [data],
  );

  return <RouterProvider router={router} />;
}

function createStoryRouter({
  data,
}: {
  data: ProjectWorkspaceData;
}) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });
  const projectRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/projects/$projectId",
    component: () => (
      <AppShell project={storyAppShellProject({ data })}>
        <OverviewPage data={data} />
      </AppShell>
    ),
  });
  const projectHypothesisRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "hypotheses/$hypothesisId",
    component: PlaceholderRoute,
  });
  const projectExperimentRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "experiments/$experimentId",
    component: PlaceholderRoute,
  });
  const routeTree = rootRoute.addChildren([
    projectRoute.addChildren([
      projectHypothesisRoute,
      projectExperimentRoute,
    ]),
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [`/projects/${data.projectId}`],
    }),
  });
}

function PlaceholderRoute() {
  return null;
}

function overviewData(): ProjectWorkspaceData {
  return {
    projectId: "support-agent-demo",
    workspace: "/Users/situ/sandbox/support-agent",
    connection: { kind: "connected" },
    project: {
      id: "support-agent-demo",
      workspace_id: "workspace_demo",
      title: "Improve support-agent resolution",
      objective: "Improve billing and cancellation outcomes without making latency worse.",
      research_context: "",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    sessions: [
      {
        id: "S1",
        workspace_id: "workspace_demo",
        project_id: "support-agent-demo",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:07:00Z",
      },
    ],
    hypotheses: [
      {
        id: "H1",
        project_id: "support-agent-demo",
        title: "Filtering low-confidence retrieval helps cancellation tickets",
        summary:
          "Drop weak snippets before tool calls so the agent cites fewer irrelevant policies.",
        status: "active",
        created_at: "2026-01-01T00:01:00Z",
        updated_at: "2026-01-01T00:08:00Z",
      },
      {
        id: "H2",
        project_id: "support-agent-demo",
        title: "Tool-use discipline reduces billing detours",
        summary: "Require account lookup before offering cancellation or refund guidance.",
        status: "open",
        created_at: "2026-01-01T00:02:00Z",
        updated_at: "2026-01-01T00:04:00Z",
      },
      {
        id: "H3",
        project_id: "support-agent-demo",
        title: "Prompt decomposition is saturated",
        summary: "Further prompt decomposition did not improve the billing slice.",
        status: "closed",
        created_at: "2026-01-01T00:01:30Z",
        updated_at: "2026-01-01T00:06:00Z",
      },
    ],
    experiments: [
      {
        id: "EX1",
        project_id: "support-agent-demo",
        status: "closed",
        title: "Baseline support eval",
        summary: "Recorded native support-agent eval output before changing behavior.",
        created_at: "2026-01-01T00:02:00Z",
        updated_at: "2026-01-01T00:03:00Z",
      },
      {
        id: "EX2",
        project_id: "support-agent-demo",
        status: "active",
        title: "Try retrieval filtering",
        summary: "Filter snippets below the confidence floor on cancellation tickets.",
        created_at: "2026-01-01T00:04:00Z",
        updated_at: "2026-01-01T00:08:00Z",
      },
      {
        id: "EX3",
        project_id: "support-agent-demo",
        status: "closed",
        title: "Try prompt decomposition",
        summary: "Split billing prompt into identify, plan, and answer steps.",
        created_at: "2026-01-01T00:03:00Z",
        updated_at: "2026-01-01T00:06:00Z",
      },
    ],
    evaluations: [
      {
        id: "EV1",
        project_id: "support-agent-demo",
        status: "closed",
        title: "Baseline support eval",
        summary: "Baseline before candidate changes.",
        associated_experiment_id: null,
        created_at: "2026-01-01T00:02:00Z",
        updated_at: "2026-01-01T00:03:00Z",
      },
      {
        id: "EV2",
        project_id: "support-agent-demo",
        status: "active",
        title: "Retrieval filtering candidate",
        summary: "Candidate measurement for EX2.",
        associated_experiment_id: "EX2",
        created_at: "2026-01-01T00:05:00Z",
        updated_at: "2026-01-01T00:08:00Z",
      },
      {
        id: "EV3",
        project_id: "support-agent-demo",
        status: "closed",
        title: "Prompt decomposition candidate",
        summary: "Candidate measurement for EX3.",
        associated_experiment_id: "EX3",
        created_at: "2026-01-01T00:04:00Z",
        updated_at: "2026-01-01T00:06:00Z",
      },
    ],
    analyses: [],
    agents: [],
    tasks: [],
    taskDependencies: [],
    taskEntityLinks: [],
    taskActivities: [],
    analysisActivities: [],
    hypothesisExperimentLinks: [
      {
        hypothesis_id: "H1",
        experiment_id: "EX2",
        created_at: "2026-01-01T00:05:00Z",
      },
      {
        hypothesis_id: "H3",
        experiment_id: "EX3",
        created_at: "2026-01-01T00:04:00Z",
      },
    ],
    hypothesisActivities: [
      {
        id: 1,
        hypothesis_id: "H1",
        actor: "agent",
        kind: "comment",
        body: "Retrieval filtering is the current thread because cancellation failures cluster around irrelevant snippets.",
        payload: { activity_type: "interpretation" },
        created_at: "2026-01-01T00:05:00Z",
      },
      {
        id: 2,
        hypothesis_id: "H3",
        actor: "agent",
        kind: "comment",
        body: "Closed prompt decomposition because the candidate did not beat baseline.",
        payload: { activity_type: "interpretation" },
        created_at: "2026-01-01T00:06:00Z",
      },
    ],
    experimentActivities: [
      {
        id: 1,
        experiment_id: "EX2",
        actor: "agent",
        kind: "comment",
        body: "Applied filtering only to retrieval selection; graders and fixtures were unchanged.",
        payload: { activity_type: "change" },
        created_at: "2026-01-01T00:06:00Z",
      },
      {
        id: 2,
        experiment_id: "EX3",
        actor: "worker",
        kind: "comment",
        body: "No meaningful lift after splitting the prompt.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:06:00Z",
      },
    ],
    evaluationActivities: [
      {
        id: 1,
        evaluation_id: "EV1",
        actor: "agent",
        kind: "result",
        body: "Baseline: resolution_rate 61.0%, latency 1830ms, hallucination_rate 2.4%.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:03:00Z",
      },
      {
        id: 2,
        evaluation_id: "EV2",
        actor: "agent",
        kind: "result",
        body: "Candidate: resolution_rate 64.8%, latency 1910ms. Needs reproduction before treating as accepted.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:08:00Z",
      },
      {
        id: 3,
        evaluation_id: "EV3",
        actor: "worker",
        kind: "result",
        body: "Candidate: resolution_rate 60.8%, latency 1860ms. Closed as unpromising.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:06:00Z",
      },
    ],
    artifacts: [],
    events: [],
  };
}
