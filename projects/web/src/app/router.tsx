import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { DxEmptyState } from "@situ/web-ui";
import { AppShell } from "./app-shell";
import { ProjectIndex } from "../features/project-index/project-index";
import { ProjectMonitor } from "../features/project-monitor/project-monitor";
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
import { LineagePage } from "../features/project-workspace/lineage/lineage-page";
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

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId",
  component: ProjectRoute,
});

const projectIndexRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "/",
  component: ProjectOverviewRoute,
});

const projectHypothesesRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "hypotheses",
  component: ProjectHypothesesRoute,
});

const projectHypothesisRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "hypotheses/$hypothesisId",
  component: ProjectHypothesisRoute,
});

const projectExperimentsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "experiments",
  component: ProjectExperimentsRoute,
});

const projectExperimentRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "experiments/$experimentId",
  component: ProjectExperimentRoute,
});

const projectLineageRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "lineage",
  component: ProjectLineageRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    experimentId:
      typeof search.experimentId === "string" ? search.experimentId : undefined,
  }),
});

const projectEvaluationsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "evaluations",
  component: ProjectEvaluationsRoute,
});

const projectEvaluationRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "evaluations/$evaluationId",
  component: ProjectEvaluationRoute,
});

const projectAgentsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "agents",
  component: ProjectAgentsRoute,
});

const projectAgentRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "agents/$agentId",
  component: ProjectAgentRoute,
});

const projectEventsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "events",
  component: ProjectEventsRoute,
});

const projectAnalysesRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "analyses",
  component: ProjectAnalysesRoute,
});

const projectAnalysisRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "analyses/$analysisId",
  component: ProjectAnalysisRoute,
});

const projectTasksRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "tasks",
  component: ProjectTasksRoute,
});

const projectTaskRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "tasks/$taskId",
  component: ProjectTaskRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute.addChildren([
    projectIndexRoute,
    projectHypothesesRoute,
    projectHypothesisRoute,
    projectExperimentsRoute,
    projectExperimentRoute,
    projectLineageRoute,
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
]);

export const router = createRouter({
  routeTree,
});

function RootLayout() {
  return <Outlet />;
}

function ProjectRoute() {
  const { projectId } = projectRoute.useParams();

  return <ProjectMonitor projectId={projectId} />;
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

function ProjectLineageRoute() {
  const data = useProjectWorkspaceData();
  const { projectId } = projectRoute.useParams();
  const { experimentId } = projectLineageRoute.useSearch();
  const navigate = useNavigate();

  return (
    <LineagePage
      data={data}
      selectedExperimentId={experimentId}
      onSelect={({ experimentId: nextId }) => {
        navigate({
          to: "/projects/$projectId/lineage",
          params: { projectId },
          search: { experimentId: nextId },
        });
      }}
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
