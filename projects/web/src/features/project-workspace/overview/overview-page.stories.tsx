import type { Meta, StoryObj } from "@storybook/react";
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
      <main className="almanac-shell">
        <OverviewPage data={data} />
      </main>
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
    workspace: "/Users/almanac/sandbox/support-agent",
    connection: { kind: "connected" },
    objectives: [
    {
      id: "objective_0001",
      title: "Improve support-agent resolution",
      description: "Improve billing and cancellation outcomes without making latency worse.",
      status: "active",
      associated_session_id: "session_0001",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  sessions: [
    {
      id: "session_0001",
      objective_id: "objective_0001",
      objective: "Improve support-agent resolution",
      research_context: "Run project-native evals and collect plaintext evidence.",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:07:00Z",
    },
  ],
  hypotheses: [
    {
      id: "hyp_0001",
      objective_id: "objective_0001",
      title: "Filtering low-confidence retrieval helps cancellation tickets",
      summary: "Drop weak snippets before tool calls so the agent cites fewer irrelevant policies.",
      status: "active",
      associated_session_id: "session_0001",
      created_at: "2026-01-01T00:01:00Z",
      updated_at: "2026-01-01T00:08:00Z",
    },
    {
      id: "hyp_0002",
      objective_id: "objective_0001",
      title: "Tool-use discipline reduces billing detours",
      summary: "Require account lookup before offering cancellation or refund guidance.",
      status: "open",
      associated_session_id: "session_0001",
      created_at: "2026-01-01T00:02:00Z",
      updated_at: "2026-01-01T00:04:00Z",
    },
    {
      id: "hyp_0003",
      objective_id: "objective_0001",
      title: "Prompt decomposition is saturated",
      summary: "Further prompt decomposition did not improve the billing slice.",
      status: "closed",
      associated_session_id: "session_0001",
      created_at: "2026-01-01T00:01:30Z",
      updated_at: "2026-01-01T00:06:00Z",
    },
  ],
  experiments: [
    {
      id: "exp_0001",
      objective_id: "objective_0001",
      status: "closed",
      title: "Baseline support eval",
      summary: "Recorded native support-agent eval output before changing behavior.",
      associated_session_id: "session_0001",
      created_at: "2026-01-01T00:02:00Z",
      updated_at: "2026-01-01T00:03:00Z",
    },
    {
      id: "exp_0002",
      objective_id: "objective_0001",
      status: "active",
      title: "Try retrieval filtering",
      summary: "Filter snippets below the confidence floor on cancellation tickets.",
      associated_session_id: "session_0001",
      created_at: "2026-01-01T00:04:00Z",
      updated_at: "2026-01-01T00:08:00Z",
    },
    {
      id: "exp_0003",
      objective_id: "objective_0001",
      status: "closed",
      title: "Try prompt decomposition",
      summary: "Split billing prompt into identify, plan, and answer steps.",
      associated_session_id: "session_0001",
      created_at: "2026-01-01T00:03:00Z",
      updated_at: "2026-01-01T00:06:00Z",
    },
  ],
  evaluations: [
    {
      id: "eval_0001",
      objective_id: "objective_0001",
      status: "closed",
      title: "Baseline support eval",
      summary: "Baseline before candidate changes.",
      associated_session_id: "session_0001",
      associated_experiment_id: null,
      created_at: "2026-01-01T00:02:00Z",
      updated_at: "2026-01-01T00:03:00Z",
    },
    {
      id: "eval_0002",
      objective_id: "objective_0001",
      status: "active",
      title: "Retrieval filtering candidate",
      summary: "Candidate measurement for exp_0002.",
      associated_session_id: "session_0001",
      associated_experiment_id: "exp_0002",
      created_at: "2026-01-01T00:05:00Z",
      updated_at: "2026-01-01T00:08:00Z",
    },
    {
      id: "eval_0003",
      objective_id: "objective_0001",
      status: "closed",
      title: "Prompt decomposition candidate",
      summary: "Candidate measurement for exp_0003.",
      associated_session_id: "session_0001",
      associated_experiment_id: "exp_0003",
      created_at: "2026-01-01T00:04:00Z",
      updated_at: "2026-01-01T00:06:00Z",
    },
  ],
  hypothesisExperimentLinks: [
    {
      hypothesis_id: "hyp_0001",
      experiment_id: "exp_0002",
      created_at: "2026-01-01T00:05:00Z",
    },
    {
      hypothesis_id: "hyp_0003",
      experiment_id: "exp_0003",
      created_at: "2026-01-01T00:04:00Z",
    },
  ],
  hypothesisActivities: [
    {
      id: 1,
      hypothesis_id: "hyp_0001",
      session_id: "session_0001",
      actor: "agent",
      kind: "comment",
      body: "Retrieval filtering is the current thread because cancellation failures cluster around irrelevant snippets.",
      payload: { activity_type: "interpretation" },
      created_at: "2026-01-01T00:05:00Z",
    },
    {
      id: 2,
      hypothesis_id: "hyp_0003",
      session_id: "session_0001",
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
      experiment_id: "exp_0002",
      session_id: "session_0001",
      actor: "agent",
      kind: "comment",
      body: "Applied filtering only to retrieval selection; graders and fixtures were unchanged.",
      payload: { activity_type: "change" },
      created_at: "2026-01-01T00:06:00Z",
    },
    {
      id: 2,
      experiment_id: "exp_0003",
      session_id: "session_0001",
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
      evaluation_id: "eval_0001",
      session_id: "session_0001",
      actor: "agent",
      kind: "comment",
      body: "Baseline: resolution_rate 61.0%, latency 1830ms, hallucination_rate 2.4%.",
      payload: { activity_type: "result" },
      created_at: "2026-01-01T00:03:00Z",
    },
    {
      id: 2,
      evaluation_id: "eval_0002",
      session_id: "session_0001",
      actor: "agent",
      kind: "comment",
      body: "Candidate: resolution_rate 64.8%, latency 1910ms. Needs reproduction before treating as accepted.",
      payload: { activity_type: "result" },
      created_at: "2026-01-01T00:08:00Z",
    },
    {
      id: 3,
      evaluation_id: "eval_0003",
      session_id: "session_0001",
      actor: "worker",
      kind: "comment",
      body: "Candidate: resolution_rate 60.8%, latency 1860ms. Closed as unpromising.",
      payload: { activity_type: "result" },
      created_at: "2026-01-01T00:06:00Z",
    },
  ],
    artifacts: [],
    events: [],
  };
}
