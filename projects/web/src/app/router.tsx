import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { DxEmptyState } from "@situ/web-ui";
import { AppShell } from "./app-shell";
import { ProjectIndex } from "../features/project-index/project-index";
import { ProjectMonitor } from "../features/project-monitor/project-monitor";
import { AgentDetailPage } from "../features/project-workspace/agents/agent-detail-page";
import { AgentsPage } from "../features/project-workspace/agents/agents-page";
import { useProjectWorkspaceData } from "../features/project-workspace/context";
import { EventsPage } from "../features/project-workspace/events/events-page";
import { EvaluationDetailPage } from "../features/project-workspace/evaluations/evaluation-detail-page";
import { EvaluationsPage } from "../features/project-workspace/evaluations/evaluations-page";
import { ExperimentDetailPage } from "../features/project-workspace/experiments/experiment-detail-page";
import { ExperimentsPage } from "../features/project-workspace/experiments/experiments-page";
import { HypothesisDetailPage } from "../features/project-workspace/hypotheses/hypothesis-detail-page";
import { HypothesesPage } from "../features/project-workspace/hypotheses/hypotheses-page";
import { OverviewPage } from "../features/project-workspace/overview/overview-page";

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

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute.addChildren([
    projectIndexRoute,
    projectHypothesesRoute,
    projectHypothesisRoute,
    projectExperimentsRoute,
    projectExperimentRoute,
    projectEvaluationsRoute,
    projectEvaluationRoute,
    projectAgentsRoute,
    projectAgentRoute,
    projectEventsRoute,
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
