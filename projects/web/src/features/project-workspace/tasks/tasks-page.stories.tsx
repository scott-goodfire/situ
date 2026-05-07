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
import { TaskDetailPage } from "./task-detail-page";
import { TasksPage } from "./tasks-page";

function storyAppShellProject({ data }: { data: ProjectWorkspaceData }): AppShellProject {
  return {
    projectId: data.projectId,
    workspace: data.workspace,
    connection: data.connection,
  };
}

const meta = {
  title: "Features/Project Workspace/Tasks",
  component: TasksStory,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", padding: 16, background: vars.color.stage }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TasksStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Board: Story = {
  args: {
    data: tasksPageData(),
    path: "/projects/P1/tasks",
  },
};

export const Detail: Story = {
  args: {
    data: tasksPageData(),
    path: "/projects/P1/tasks/T3",
  },
};

function TasksStory({
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
  const tasksRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "tasks",
    component: () => <TasksPage data={data} />,
  });
  const taskRoute = createRoute({
    getParentRoute: () => projectRoute,
    path: "tasks/$taskId",
    component: () => {
      const { taskId } = taskRoute.useParams();
      return <TaskDetailPage data={data} taskId={taskId} />;
    },
  });

  return createRouter({
    routeTree: rootRoute.addChildren([
      projectRoute.addChildren([tasksRoute, taskRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
}

function tasksPageData(): ProjectWorkspaceData {
  return {
    projectId: "P1",
    workspace: "/Users/situ/sandbox/support-agent",
    connection: { kind: "connected" },
    project: {
      id: "P1",
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
        project_id: "P1",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:10:00Z",
      },
    ],
    hypotheses: [],
    experiments: [],
    evaluations: [],
    analyses: [],
    agents: [
      {
        id: "agent_research_001",
        project_id: "P1",
        kind: "scientist",
        display_name: "Research Agent",
        model_name: "claude-opus-4-7",
        status: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    tasks: [
      {
        id: "T1",
        project_id: "P1",
        title: "Plan baseline + first hypothesis for billing slice",
        content: "Survey activity stream, define what counts as resolved, and queue a baseline experiment.",
        kind: "plan",
        status: "done",
        priority: "high",
        source_kind: "manager",
        assignee_id: "agent_research_001",
        created_at: "2026-01-01T00:00:30Z",
        available_at: "2026-01-01T00:00:30Z",
        completed_at: "2026-01-01T00:01:00Z",
        updated_at: "2026-01-01T00:01:00Z",
      },
      {
        id: "T2",
        project_id: "P1",
        title: "Record support-agent baseline eval",
        content: "Run native support-agent eval; capture stdout + per-bucket metrics as artifact.",
        kind: "baseline",
        status: "done",
        priority: "normal",
        source_kind: "manager",
        assignee_id: "agent_research_001",
        created_at: "2026-01-01T00:01:30Z",
        available_at: "2026-01-01T00:01:30Z",
        completed_at: "2026-01-01T00:03:00Z",
        updated_at: "2026-01-01T00:03:00Z",
      },
      {
        id: "T3",
        project_id: "P1",
        title: "Run retrieval-filter candidate eval",
        content: "Apply confidence-floor filter at retrieval and re-run cancellation slice.",
        kind: "experiment",
        status: "in_progress",
        priority: "urgent",
        source_kind: "manager",
        assignee_id: "agent_research_001",
        parent_task_id: "T1",
        created_at: "2026-01-01T00:04:00Z",
        available_at: "2026-01-01T00:04:00Z",
        claimed_at: "2026-01-01T00:05:00Z",
        updated_at: "2026-01-01T00:08:00Z",
      },
      {
        id: "T4",
        project_id: "P1",
        title: "Reproduce retrieval-filter result before accepting",
        content: "Re-run candidate twice; compare stdout digests; promote evidence only if reproduction matches.",
        kind: "interpret",
        status: "backlog",
        priority: "high",
        source_kind: "manager",
        parent_task_id: "T3",
        created_at: "2026-01-01T00:08:00Z",
        available_at: "2026-01-01T00:09:00Z",
        updated_at: "2026-01-01T00:08:00Z",
      },
      {
        id: "T5",
        project_id: "P1",
        title: "Try prompt decomposition on billing slice",
        content: "Split billing prompt into identify, plan, answer steps and rerun.",
        kind: "experiment",
        status: "failed",
        priority: "low",
        source_kind: "manager",
        assignee_id: "agent_research_001",
        created_at: "2026-01-01T00:03:30Z",
        available_at: "2026-01-01T00:03:30Z",
        completed_at: "2026-01-01T00:06:00Z",
        result_summary: "No meaningful lift after splitting prompt; closed as saturated.",
        updated_at: "2026-01-01T00:06:00Z",
      },
    ],
    taskDependencies: [
      {
        project_id: "P1",
        task_id: "T4",
        blocked_by_task_id: "T3",
        created_at: "2026-01-01T00:08:00Z",
      },
    ],
    taskEntityLinks: [
      {
        project_id: "P1",
        task_id: "T3",
        entity_kind: "experiment",
        entity_id: "E2",
        relationship: "produces",
        created_at: "2026-01-01T00:05:00Z",
      },
      {
        project_id: "P1",
        task_id: "T3",
        entity_kind: "hypothesis",
        entity_id: "H1",
        relationship: "tests",
        created_at: "2026-01-01T00:05:00Z",
      },
    ],
    taskActivities: [
      {
        id: 1,
        project_id: "P1",
        task_id: "T3",
        actor: "research-agent",
        actor_agent_id: "agent_research_001",
        kind: "comment",
        body: "Filter applied; first run is queued.",
        created_at: "2026-01-01T00:05:30Z",
      },
      {
        id: 2,
        project_id: "P1",
        task_id: "T3",
        actor: "research-agent",
        actor_agent_id: "agent_research_001",
        kind: "comment",
        body: "First run resolution_rate 64.8% — needs reproduction before promoting.",
        payload: { activity_type: "result" },
        created_at: "2026-01-01T00:08:00Z",
      },
    ],
    analysisActivities: [],
    hypothesisExperimentLinks: [],
    hypothesisActivities: [],
    experimentActivities: [],
    evaluationActivities: [],
    artifacts: [],
    events: [],
  };
}
