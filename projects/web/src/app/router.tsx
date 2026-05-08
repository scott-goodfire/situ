import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DxEmptyState } from "@situ/web-ui";
import { AppShell } from "./app-shell";
import { ProjectIndex } from "../features/project-index/project-index";
import { ProjectMonitor } from "../features/project-monitor/project-monitor";
import { fetchProject } from "../project-discovery/client";
import { AgentDetailPage } from "../features/project-workspace/agents/agent-detail-page";
import { AgentsPage } from "../features/project-workspace/agents/agents-page";
import { AnalysisDetailPage } from "../features/project-workspace/analyses/analysis-detail-page";
import { AnalysesPage } from "../features/project-workspace/analyses/analyses-page";
import { useProjectWorkspaceData } from "../features/project-workspace/context";
import { EventsPage } from "../features/project-workspace/events/events-page";
import { EvaluationDetailPage } from "../features/project-workspace/evaluations/evaluation-detail-page";
import { EvaluationsPage } from "../features/project-workspace/evaluations/evaluations-page";
import { ExperimentDetailPage } from "../features/project-workspace/experiments/experiment-detail-page";
import { ExperimentsPage } from "../features/project-workspace/experiments/experiments-page";
import { HypothesisDetailPage } from "../features/project-workspace/hypotheses/hypothesis-detail-page";
import { HypothesesPage } from "../features/project-workspace/hypotheses/hypotheses-page";
import { TrajectoryPage } from "../features/project-workspace/trajectory/trajectory-page";
import { useSessionConnection } from "../features/project-monitor/session-connection-context";
import { useArtifactContentLoader } from "../features/project-monitor/use-artifact-content-loader";
import { OverviewPage } from "../features/project-workspace/overview/overview-page";
import { TaskDetailPage } from "../features/project-workspace/tasks/task-detail-page";
import { TasksPage } from "../features/project-workspace/tasks/tasks-page";

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundRoute,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ProjectIndex,
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId",
  component: WorkspaceLayoutRoute,
});

const workspaceIndexRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/",
  component: WorkspaceRoute,
});

const workspaceProjectRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "projects/$projectId",
  component: ProjectRoute,
});

const projectCompatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$workspaceId",
  component: ProjectCompatRoute,
});

const projectCompatIndexRoute = createRoute({
  getParentRoute: () => projectCompatRoute,
  path: "/",
  component: ProjectCompatIndexRoute,
});

const projectCompatSplatRoute = createRoute({
  getParentRoute: () => projectCompatRoute,
  path: "$",
  component: ProjectCompatSplatRoute,
});

const projectIndexRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "/",
  component: ProjectOverviewRoute,
});

const projectHypothesesRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "hypotheses",
  component: ProjectHypothesesRoute,
});

const projectHypothesisRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "hypotheses/$hypothesisId",
  component: ProjectHypothesisRoute,
});

const projectExperimentsRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "experiments",
  component: ProjectExperimentsRoute,
});

const projectExperimentRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "experiments/$experimentId",
  component: ProjectExperimentRoute,
});

const projectTrajectoryRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "trajectory",
  component: ProjectTrajectoryRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    experimentId:
      typeof search.experimentId === "string" ? search.experimentId : undefined,
  }),
});

const projectEvaluationsRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "evaluations",
  component: ProjectEvaluationsRoute,
});

const projectEvaluationRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "evaluations/$evaluationId",
  component: ProjectEvaluationRoute,
});

const projectAgentsRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "agents",
  component: ProjectAgentsRoute,
});

const projectAgentRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "agents/$agentId",
  component: ProjectAgentRoute,
});

const projectEventsRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "events",
  component: ProjectEventsRoute,
});

const projectAnalysesRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "analyses",
  component: ProjectAnalysesRoute,
});

const projectAnalysisRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "analyses/$analysisId",
  component: ProjectAnalysisRoute,
});

const projectTasksRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "tasks",
  component: ProjectTasksRoute,
});

const projectTaskRoute = createRoute({
  getParentRoute: () => workspaceProjectRoute,
  path: "tasks/$taskId",
  component: ProjectTaskRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectCompatRoute.addChildren([
    projectCompatIndexRoute,
    projectCompatSplatRoute,
  ]),
  workspaceRoute.addChildren([
    workspaceIndexRoute,
    workspaceProjectRoute.addChildren([
      projectIndexRoute,
      projectHypothesesRoute,
      projectHypothesisRoute,
      projectExperimentsRoute,
      projectExperimentRoute,
      projectTrajectoryRoute,
      projectEvaluationsRoute,
      projectEvaluationRoute,
      projectAgentsRoute,
      projectAgentRoute,
      projectEventsRoute,
      projectAnalysesRoute,
      projectAnalysisRoute,
      projectTasksRoute,
      projectTaskRoute,
    ]),
  ]),
]);

export const router = createRouter({
  routeTree,
});

function RootLayout() {
  return <Outlet />;
}

function WorkspaceLayoutRoute() {
  return <Outlet />;
}

function WorkspaceRoute() {
  const { workspaceId } = workspaceRoute.useParams();

  return <ProjectMonitor workspaceId={workspaceId} />;
}

function ProjectRoute() {
  const { workspaceId, projectId } = workspaceProjectRoute.useParams();

  return <ProjectMonitor workspaceId={workspaceId} selectedProjectId={projectId} />;
}

function ProjectCompatRoute() {
  return <Outlet />;
}

function ProjectCompatIndexRoute() {
  const { workspaceId: legacyId } = projectCompatRoute.useParams();
  const projectQuery = useQuery({
    queryKey: ["project-compat", legacyId],
    queryFn: () => fetchProject({ projectId: legacyId }),
    retry: false,
  });
  const project = projectQuery.data?.project ?? null;

  if (project?.workspace_id && project.workspace_id !== legacyId) {
    return (
      <Navigate
        to="/workspaces/$workspaceId/projects/$projectId"
        params={{ workspaceId: project.workspace_id, projectId: project.project_id }}
        replace
      />
    );
  }

  if (projectQuery.isPending) {
    return (
      <AppShell>
        <DxEmptyState
          heading="Opening project"
          description="Resolving the workspace route."
        />
      </AppShell>
    );
  }

  return (
    <Navigate
      to="/workspaces/$workspaceId"
      params={{ workspaceId: project?.workspace_id ?? legacyId }}
      replace
    />
  );
}

function ProjectCompatSplatRoute() {
  const { workspaceId } = projectCompatSplatRoute.useParams();

  return (
    <Navigate
      to="/workspaces/$workspaceId"
      params={{ workspaceId }}
      replace
    />
  );
}

function ProjectOverviewRoute() {
  const data = useProjectWorkspaceData();

  return <OverviewPage data={data} />;
}

function ProjectHypothesesRoute() {
  const data = useProjectWorkspaceData();

  return <HypothesesPage data={data} />;
}

function ProjectHypothesisRoute() {
  const data = useProjectWorkspaceData();
  const { hypothesisId } = projectHypothesisRoute.useParams();

  return <HypothesisDetailPage data={data} hypothesisId={hypothesisId} />;
}

function ProjectExperimentsRoute() {
  const data = useProjectWorkspaceData();

  return <ExperimentsPage data={data} />;
}

function ProjectExperimentRoute() {
  const data = useProjectWorkspaceData();
  const { experimentId } = projectExperimentRoute.useParams();

  return <ExperimentDetailPage data={data} experimentId={experimentId} />;
}

function ProjectTrajectoryRoute() {
  const data = useProjectWorkspaceData();
  const { experimentId } = projectTrajectoryRoute.useSearch();
  const navigate = useNavigate();
  const session = useSessionConnection();
  const loadArtifactContent = useArtifactContentLoader({ session });

  return (
    <TrajectoryPage
      data={data}
      selectedExperimentId={experimentId}
      onSelect={({ experimentId: nextId }) => {
        navigate({
          to: "/workspaces/$workspaceId/projects/$projectId/trajectory",
          params: { workspaceId: data.workspaceId, projectId: data.projectId },
          search: { experimentId: nextId },
        });
      }}
      loadArtifactContent={loadArtifactContent}
    />
  );
}

function ProjectEvaluationsRoute() {
  const data = useProjectWorkspaceData();

  return <EvaluationsPage data={data} />;
}

function ProjectEvaluationRoute() {
  const data = useProjectWorkspaceData();
  const { evaluationId } = projectEvaluationRoute.useParams();

  return <EvaluationDetailPage data={data} evaluationId={evaluationId} />;
}

function ProjectAgentsRoute() {
  const data = useProjectWorkspaceData();

  return <AgentsPage data={data} />;
}

function ProjectAgentRoute() {
  const data = useProjectWorkspaceData();
  const { agentId } = projectAgentRoute.useParams();

  return <AgentDetailPage data={data} agentId={agentId} />;
}

function ProjectEventsRoute() {
  const data = useProjectWorkspaceData();

  return <EventsPage data={data} />;
}

function ProjectAnalysesRoute() {
  const data = useProjectWorkspaceData();

  return <AnalysesPage data={data} />;
}

function ProjectAnalysisRoute() {
  const data = useProjectWorkspaceData();
  const { analysisId } = projectAnalysisRoute.useParams();

  return <AnalysisDetailPage data={data} analysisId={analysisId} />;
}

function ProjectTasksRoute() {
  const data = useProjectWorkspaceData();

  return <TasksPage data={data} />;
}

function ProjectTaskRoute() {
  const data = useProjectWorkspaceData();
  const { taskId } = projectTaskRoute.useParams();

  return <TaskDetailPage data={data} taskId={taskId} />;
}

function NotFoundRoute() {
  return (
    <AppShell>
      <DxEmptyState
        heading="Page not found"
        description="Open the local project index or a project monitor URL."
      />
    </AppShell>
  );
}
