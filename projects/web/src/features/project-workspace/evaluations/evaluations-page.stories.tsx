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
import { AppShell, type AppShellProject } from "../../../app/app-shell";
import type { ProjectWorkspaceData } from "../types";
import { EvaluationDetailPage } from "./evaluation-detail-page";
import { EvaluationsPage } from "./evaluations-page";

function storyAppShellProject({ data }: { data: ProjectWorkspaceData }): AppShellProject {
  return {
    projectId: data.projectId,
    workspace: data.workspace,
    connection: data.connection,
  };
}

const meta = {
  title: "Features/Project Workspace/Evaluations",
  component: EvaluationsStory,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof EvaluationsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const List: Story = {
  args: {
    data: evaluationPageData(),
    path: "/projects/support-agent-demo/evaluations",
  },
};

export const Detail: Story = {
  args: {
    data: evaluationPageData(),
    path: "/projects/support-agent-demo/evaluations/eval_0002",
  },
};

function EvaluationsStory({
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
  const evaluationsRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "evaluations",
    component: () => (
      <AppShell project={storyAppShellProject({ data })}>
        <EvaluationsPage data={data} />
      </AppShell>
    ),
  });
  const evaluationRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "evaluations/$evaluationId",
    component: () => {
      const { evaluationId } = evaluationRoute.useParams();

      return (
        <AppShell project={storyAppShellProject({ data })}>
          <EvaluationDetailPage data={data} evaluationId={evaluationId} />
        </AppShell>
      );
    },
  });
  const experimentRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "experiments/$experimentId",
    component: PlaceholderRoute,
  });
  const routeTree = rootRoute.addChildren([
    projectRoute.addChildren([
      evaluationsRoute,
      evaluationRoute,
      experimentRoute,
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

function evaluationPageData(): ProjectWorkspaceData {
  return {
    projectId: "support-agent-demo",
    workspace: "/Users/situ/sandbox/support-agent",
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
        updated_at: "2026-01-01T00:07:00Z",
      },
    ],
    hypotheses: [],
    experiments: [
      {
        id: "exp_0002",
        session_id: "session_0001",
        status: "active",
        title: "Try retrieval filtering",
        summary: "Filter snippets below the confidence floor on cancellation tickets.",
        created_at: "2026-01-01T00:04:00Z",
        updated_at: "2026-01-01T00:08:00Z",
      },
    ],
    evaluations: [
      {
        id: "eval_0001",
        session_id: "session_0001",
        status: "closed",
        title: "Baseline support eval",
        summary: "Baseline before candidate changes.",
        associated_experiment_id: null,
        created_at: "2026-01-01T00:02:00Z",
        updated_at: "2026-01-01T00:03:00Z",
      },
      {
        id: "eval_0002",
        session_id: "session_0001",
        status: "active",
        title: "Retrieval filtering candidate",
        summary: "Candidate measurement for exp_0002.",
        associated_experiment_id: "exp_0002",
        created_at: "2026-01-01T00:05:00Z",
        updated_at: "2026-01-01T00:08:00Z",
      },
    ],
    hypothesisExperimentLinks: [],
    hypothesisActivities: [],
    experimentActivities: [],
    evaluationActivities: [
      {
        id: 1,
        evaluation_id: "eval_0001",
        actor: "agent",
        kind: "comment",
        body: "Baseline: resolution_rate 61.0%, latency 1830ms, hallucination_rate 2.4%.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:03:00Z",
      },
      {
        id: 2,
        evaluation_id: "eval_0002",
        actor: "agent",
        kind: "comment",
        body: "Candidate: resolution_rate 64.8%, latency 1910ms. Needs reproduction before treating as accepted.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:08:00Z",
      },
    ],
    artifacts: [
      {
        id: "artifact_0001",
        session_id: "session_0001",
        associated_entity_kind: "evaluation",
        associated_entity_id: "eval_0002",
        kind: "log",
        title: "Candidate stdout",
        path: "artifacts/eval_0002/stdout.txt",
        created_at: "2026-01-01T00:08:01Z",
      },
    ],
    events: [],
  };
}
