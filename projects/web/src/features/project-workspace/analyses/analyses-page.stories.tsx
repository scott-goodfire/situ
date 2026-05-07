import type { Meta, StoryObj } from "@storybook/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useMemo } from "react";
import { vars } from "@situ/web-ui";
import { AppShell, type AppShellProject } from "../../../app/app-shell";
import type { ProjectWorkspaceData } from "../types";
import { AnalysesPage } from "./analyses-page";
import { AnalysisDetailPage } from "./analysis-detail-page";

function storyAppShellProject({ data }: { data: ProjectWorkspaceData }): AppShellProject {
  return {
    projectId: data.projectId,
    workspace: data.workspace,
    connection: data.connection,
  };
}

const meta = {
  title: "Features/Project Workspace/Analyses",
  component: AnalysesStory,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", padding: 16, background: vars.color.stage }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnalysesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const List: Story = {
  args: {
    data: analysesPageData(),
    path: "/projects/support-agent-demo/analyses",
  },
};

export const Detail: Story = {
  args: {
    data: analysesPageData(),
    path: "/projects/support-agent-demo/analyses/A1",
  },
};

function AnalysesStory({
  data,
  path,
}: {
  data: ProjectWorkspaceData;
  path: string;
}) {
  const router = useMemo(
    () => createStoryRouter({ data, path }),
    [data, path],
  );

  return <RouterProvider router={router} />;
}

function createStoryRouter({
  data,
  path,
}: {
  data: ProjectWorkspaceData;
  path: string;
}) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const projectRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/projects/$projectId",
    component: () => (
      <AppShell project={storyAppShellProject({ data })}>
        <Outlet />
      </AppShell>
    ),
  });
  const analysesRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "analyses",
    component: () => <AnalysesPage data={data} />,
  });
  const analysisRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "analyses/$analysisId",
    component: () => {
      const { analysisId } = analysisRoute.useParams();
      return <AnalysisDetailPage data={data} analysisId={analysisId} />;
    },
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      projectRoute.addChildren([analysesRoute, analysisRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
}

function analysesPageData(): ProjectWorkspaceData {
  return {
    projectId: "support-agent-demo",
    workspace: "/Users/situ/sandbox/support-agent",
    connection: { kind: "connected" },
    project: {
      id: "support-agent-demo",
      workspace_id: "workspace_demo",
      title: "Improve support-agent resolution",
      objective: "Improve billing and cancellation outcomes without making latency worse.",
      research_context: "Local sandbox; eval is the support-agent canary suite.",
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
        updated_at: "2026-01-01T00:10:00Z",
      },
    ],
    hypotheses: [],
    experiments: [],
    evaluations: [],
    analyses: [
      {
        id: "A1",
        project_id: "support-agent-demo",
        status: "active",
        title: "Support-agent codebase map",
        summary: "Retrieval pipeline lives in `agents/support/retrieval.py`; tool calls in `tools/support/`.",
        content: "Detailed breakdown of the support-agent module layout and the surfaces that touch billing and cancellation flows.",
        created_at: "2026-01-01T00:01:00Z",
        updated_at: "2026-01-01T00:05:00Z",
      },
      {
        id: "A2",
        project_id: "support-agent-demo",
        status: "active",
        title: "Latency budget — 2s p95",
        summary: "Cancellation-flow tool budget is tight; retrieval candidates over ~600ms hurt the budget.",
        content: "User research data shows 2s p95 is the perceived-acceptable ceiling.",
        created_at: "2026-01-01T00:02:00Z",
        updated_at: "2026-01-01T00:02:00Z",
      },
      {
        id: "A3",
        project_id: "support-agent-demo",
        status: "open",
        title: "Open: weak retrieval clusters by topic",
        summary: "Are weak-confidence retrievals concentrated in the cancellation slice or spread evenly?",
        content: "Need to bucket retrieval scores by ticket topic before deciding hypothesis priority.",
        created_at: "2026-01-01T00:03:00Z",
        updated_at: "2026-01-01T00:03:00Z",
      },
      {
        id: "A4",
        project_id: "support-agent-demo",
        status: "closed",
        title: "Synthesis: prompt decomposition saturated",
        summary: "Prompt decomposition is closed; further splits don't help the billing slice.",
        content: "Reviewed E3 results across 3 reproductions; gains are within noise.",
        created_at: "2026-01-01T00:04:00Z",
        updated_at: "2026-01-01T00:06:00Z",
      },
    ],
    agents: [],
    tasks: [],
    taskDependencies: [],
    taskEntityLinks: [],
    taskActivities: [],
    analysisActivities: [
      {
        id: 1,
        analysis_id: "A1",
        actor: "research-agent",
        kind: "comment",
        body: "Mapped retrieval and tool-call surfaces across `agents/support/` — cancellation paths cluster around two helpers.",
        payload: { activity_type: "interpretation" },
        created_at: "2026-01-01T00:05:00Z",
      },
    ],
    hypothesisExperimentLinks: [],
    hypothesisActivities: [],
    experimentActivities: [],
    evaluationActivities: [],
    artifacts: [],
    events: [],
  };
}
