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
import type { ProjectWorkspaceData } from "../types";
import { AgentDetailPage } from "./agent-detail-page";
import { AgentsPage } from "./agents-page";

const meta = {
  title: "Features/Project Workspace/Agents",
  component: AgentsStory,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AgentsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const List: Story = {
  args: {
    data: agentPageData(),
    path: "/projects/support-agent-demo/agents",
  },
};

export const Detail: Story = {
  args: {
    data: agentPageData(),
    path: "/projects/support-agent-demo/agents/research-agent",
  },
};

function AgentsStory({
  data,
  path,
}: {
  data: ProjectWorkspaceData;
  path: string;
}) {
  const router = useMemo(
    () =>
      createStoryRouter({
        data,
        path,
      }),
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
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });
  const projectRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/projects/$projectId",
    component: () => <Outlet />,
  });
  const agentsRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "agents",
    component: () => (
      <main className="almanac-shell">
        <AgentsPage data={data} />
      </main>
    ),
  });
  const agentRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "agents/$agentId",
    component: () => {
      const { agentId } = agentRoute.useParams();

      return (
        <main className="almanac-shell">
          <AgentDetailPage data={data} agentId={agentId} />
        </main>
      );
    },
  });
  const hypothesisRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "hypotheses/$hypothesisId",
    component: PlaceholderRoute,
  });
  const experimentRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "experiments/$experimentId",
    component: PlaceholderRoute,
  });
  const evaluationRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "evaluations/$evaluationId",
    component: PlaceholderRoute,
  });
  const routeTree = rootRoute.addChildren([
    projectRoute.addChildren([
      agentsRoute,
      agentRoute,
      hypothesisRoute,
      experimentRoute,
      evaluationRoute,
    ]),
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [path],
    }),
  });
}

function PlaceholderRoute() {
  return null;
}

function agentPageData(): ProjectWorkspaceData {
  return {
    projectId: "support-agent-demo",
    workspace: "/Users/almanac/sandbox/support-agent",
    connection: { kind: "connected" },
    objectives: [
      {
        id: "obj_session_0001",
        session_id: "session_0001",
        title: "Improve support-agent resolution",
        description:
          "Improve billing and cancellation outcomes without making latency worse.",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    sessions: [
      {
        id: "session_0001",
        project_id: "support-agent-demo",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:10:00Z",
      },
    ],
    hypotheses: [
      {
        id: "hyp_0001",
        session_id: "session_0001",
        title: "Retrieval filtering helps cancellation tickets",
        summary: "Drop weak snippets before tool calls.",
        status: "active",
        created_at: "2026-01-01T00:01:00Z",
        updated_at: "2026-01-01T00:09:00Z",
      },
    ],
    experiments: [
      {
        id: "exp_0002",
        session_id: "session_0001",
        status: "active",
        title: "Try retrieval filtering",
        summary: "Filter snippets below the confidence floor on cancellation tickets.",
        created_at: "2026-01-01T00:04:00Z",
        updated_at: "2026-01-01T00:09:00Z",
      },
    ],
    evaluations: [
      {
        id: "eval_0002",
        session_id: "session_0001",
        status: "active",
        title: "Retrieval filtering candidate",
        summary: "Candidate measurement for exp_0002.",
        associated_experiment_id: "exp_0002",
        created_at: "2026-01-01T00:05:00Z",
        updated_at: "2026-01-01T00:09:00Z",
      },
    ],
    hypothesisExperimentLinks: [
      {
        hypothesis_id: "hyp_0001",
        experiment_id: "exp_0002",
        created_at: "2026-01-01T00:04:00Z",
      },
    ],
    hypothesisActivities: [
      {
        id: 1,
        hypothesis_id: "hyp_0001",
        actor: "research-agent",
        kind: "comment",
        body: "Cancellation failures are clustering around weak retrieval snippets, so this hypothesis is the current thread.",
        payload: { activity_type: "interpretation" },
        created_at: "2026-01-01T00:04:00Z",
      },
    ],
    experimentActivities: [
      {
        id: 1,
        experiment_id: "exp_0002",
        actor: "research-agent",
        kind: "comment",
        body: "Applied filtering only to retrieval selection; graders and fixtures were unchanged.",
        payload: { activity_type: "change" },
        created_at: "2026-01-01T00:06:00Z",
      },
      {
        id: 2,
        experiment_id: "exp_0002",
        actor: "worker",
        kind: "comment",
        body: "Ran the candidate eval and preserved stdout as an artifact.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:07:00Z",
      },
    ],
    evaluationActivities: [
      {
        id: 1,
        evaluation_id: "eval_0002",
        actor: "research-agent",
        kind: "comment",
        body: "Candidate: resolution_rate 64.8%, latency 1910ms. Needs reproduction before treating as accepted.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:08:00Z",
      },
      {
        id: 2,
        evaluation_id: "eval_0002",
        actor: "research-agent",
        kind: "comment",
        body: "Concern: the best result is not reproduced yet.",
        payload: { activity_type: "concern" },
        created_at: "2026-01-01T00:09:00Z",
      },
    ],
    artifacts: [],
    events: [],
  };
}
