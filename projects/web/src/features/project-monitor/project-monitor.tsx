import { DxEmptyState } from "@situ/web-ui";
import type { ProjectRecord, SessionRecord } from "@situ/protocol";
import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { AppShell } from "../../app/app-shell";
import * as s from "../../styles.css";
import { fetchProjectSession } from "../../project-discovery/client";
import type {
  ProjectSummary,
  SessionConnection,
} from "../../project-discovery/types";
import type { ConnectionState } from "../run-monitor/connection-badge";
import { ProjectWorkspaceProvider } from "../project-workspace/context";
import { ProjectWorkspaceLayout } from "../project-workspace/project-workspace";
import type { ProjectWorkspaceData } from "../project-workspace/types";
import {
  useLiveProjectSession,
  type LiveProjectSessionState,
} from "./use-live-project-session";

export function ProjectMonitor({ projectId }: { projectId: string }) {
  const sessionQuery = useQuery({
    queryKey: ["project-session", projectId],
    queryFn: () => fetchProjectSession({ projectId }),
    refetchInterval: 1_500,
    retry: false,
  });
  const response = sessionQuery.data;
  const discoveryError = sessionQuery.error
    ? errorMessage({ error: sessionQuery.error })
    : undefined;
  const project = response?.project ?? null;

  if (sessionQuery.isPending && !project) {
    return <ConnectingShell projectId={projectId} />;
  }

  if (!response && discoveryError) {
    return (
      <FailedShell
        projectId={projectId}
        connection={{ kind: "failed", message: discoveryError }}
      />
    );
  }

  if (!project) {
    return <UnknownProject projectId={projectId} />;
  }

  if (response?.session) {
    return (
      <LiveProjectSession
        key={sessionKey({ session: response.session })}
        projectId={projectId}
        session={response.session}
        discoveryError={discoveryError}
      />
    );
  }

  return (
    <ProjectNoActiveHarness
      project={project}
      discoveryError={discoveryError}
    />
  );
}

function LiveProjectSession({
  projectId,
  session,
  discoveryError,
}: {
  projectId: string;
  session: SessionConnection;
  discoveryError: string | undefined;
}) {
  const liveSession = useLiveProjectSession({ session });
  const workspaceData = scopedWorkspaceData({
    liveSession,
    routeProjectId: projectId,
    session,
  });

  return (
    <ProjectWorkspaceProvider data={workspaceData}>
      <ProjectWorkspaceLayout data={workspaceData} discoveryError={discoveryError}>
        <Outlet />
      </ProjectWorkspaceLayout>
    </ProjectWorkspaceProvider>
  );
}

function ProjectNoActiveHarness({
  project,
  discoveryError,
}: {
  project: ProjectSummary;
  discoveryError: string | undefined;
}) {
  const workspace = project.workspace ?? project.project_id;
  const description = project.status_reason
    ? `${project.status_reason} Start a session from a terminal, then reopen this monitor.`
    : "Start a session from a terminal, then reopen this monitor.";

  return (
    <AppShell
      project={{
        projectId: project.project_id,
        workspace,
        connection: { kind: "missing" },
      }}
    >
      {discoveryError && (
        <p className={s.status} data-tone="warning">
          {discoveryError}
        </p>
      )}
      <DxEmptyState
        heading="No active Situ harness"
        description={description}
      />
    </AppShell>
  );
}

function ConnectingShell({
  projectId,
  workspace,
}: {
  projectId: string;
  workspace?: string;
}) {
  return (
    <AppShell
      project={{
        projectId,
        workspace,
        connection: { kind: "checking" },
      }}
    >
      <DxEmptyState
        heading="Connecting"
        description="Looking for a live Situ session for this project."
      />
    </AppShell>
  );
}

function FailedShell({
  projectId,
  connection,
}: {
  projectId: string;
  connection: ConnectionState;
}) {
  const message =
    connection.kind === "failed" || connection.kind === "disconnected"
      ? connection.message
      : undefined;

  return (
    <AppShell project={{ projectId, workspace: undefined, connection }}>
      <DxEmptyState
        heading="Could not reach Situ"
        description={message ?? "Discovery API is unavailable."}
      />
    </AppShell>
  );
}

function UnknownProject({ projectId }: { projectId: string }) {
  return (
    <AppShell>
      <DxEmptyState
        heading="Project not found"
        description={`No local Situ project exists with id ${projectId}.`}
      />
    </AppShell>
  );
}

function sessionKey({ session }: { session: SessionConnection }): string {
  return `${session.url}:${session.started_at}`;
}

function scopedWorkspaceData({
  liveSession,
  routeProjectId,
  session,
}: {
  liveSession: LiveProjectSessionState;
  routeProjectId: string;
  session: SessionConnection;
}): ProjectWorkspaceData {
  const activeProjectRecordId = currentProjectRecordId({
    projects: liveSession.projects,
    routeProjectId,
    sessions: liveSession.sessions,
  });
  const project = activeProjectRecordId
    ? liveSession.projects.find((record) => record.id === activeProjectRecordId)
    : undefined;
  const sessions = activeProjectRecordId
    ? liveSession.sessions.filter(
        (record) => record.project_id === activeProjectRecordId,
      )
    : [];
  const agents = activeProjectRecordId
    ? liveSession.agents.filter((record) => record.project_id === activeProjectRecordId)
    : [];
  const analyses = activeProjectRecordId
    ? liveSession.analyses.filter((record) => record.project_id === activeProjectRecordId)
    : [];
  const hypotheses = activeProjectRecordId
    ? liveSession.hypotheses.filter(
        (record) => record.project_id === activeProjectRecordId,
      )
    : [];
  const experiments = activeProjectRecordId
    ? liveSession.experiments.filter(
        (record) => record.project_id === activeProjectRecordId,
      )
    : [];
  const evaluations = activeProjectRecordId
    ? liveSession.evaluations.filter(
        (record) => record.project_id === activeProjectRecordId,
      )
    : [];
  const tasks = activeProjectRecordId
    ? liveSession.tasks.filter((record) => record.project_id === activeProjectRecordId)
    : [];
  const artifacts = activeProjectRecordId
    ? liveSession.artifacts.filter(
        (record) => record.project_id === activeProjectRecordId,
      )
    : [];
  const taskIds = new Set(tasks.map((record) => record.id));
  const analysisIds = new Set(analyses.map((record) => record.id));
  const hypothesisIds = new Set(hypotheses.map((record) => record.id));
  const experimentIds = new Set(experiments.map((record) => record.id));
  const evaluationIds = new Set(evaluations.map((record) => record.id));
  const sessionIds = new Set(sessions.map((record) => record.id));

  return {
    projectId: routeProjectId,
    activeProjectRecordId,
    workspace: session.workspace,
    connection: liveSession.connection,
    project,
    sessions,
    hypotheses,
    experiments,
    evaluations,
    analyses,
    agents,
    tasks,
    taskDependencies: liveSession.taskDependencies.filter((record) =>
      taskIds.has(record.task_id),
    ),
    taskEntityLinks: liveSession.taskEntityLinks.filter((record) =>
      taskIds.has(record.task_id),
    ),
    taskActivities: liveSession.taskActivities.filter((record) =>
      taskIds.has(record.task_id),
    ),
    analysisActivities: liveSession.analysisActivities.filter((record) =>
      analysisIds.has(record.analysis_id),
    ),
    hypothesisExperimentLinks: liveSession.hypothesisExperimentLinks.filter(
      (record) =>
        hypothesisIds.has(record.hypothesis_id) &&
        experimentIds.has(record.experiment_id),
    ),
    hypothesisActivities: liveSession.hypothesisActivities.filter((record) =>
      hypothesisIds.has(record.hypothesis_id),
    ),
    experimentActivities: liveSession.experimentActivities.filter((record) =>
      experimentIds.has(record.experiment_id),
    ),
    evaluationActivities: liveSession.evaluationActivities.filter((record) =>
      evaluationIds.has(record.evaluation_id),
    ),
    artifacts,
    events: liveSession.events.filter(
      (record) =>
        record.associated_project_id === activeProjectRecordId ||
        Boolean(
          record.associated_session_id &&
            sessionIds.has(record.associated_session_id),
        ),
    ),
  };
}

function currentProjectRecordId({
  projects,
  routeProjectId,
  sessions,
}: {
  projects: ProjectRecord[];
  routeProjectId: string;
  sessions: SessionRecord[];
}): string | undefined {
  const activeSession = reverseRecords({ records: sessions }).find(
    (record) => record.status === "active" && record.project_id,
  );
  if (activeSession?.project_id) {
    return activeSession.project_id;
  }

  const latestSession = reverseRecords({ records: sessions }).find(
    (record) => record.project_id,
  );
  if (latestSession?.project_id) {
    return latestSession.project_id;
  }

  const activeProject = reverseRecords({ records: projects }).find(
    (record) => record.workspace_id === routeProjectId && record.status === "active",
  );
  if (activeProject) {
    return activeProject.id;
  }

  return reverseRecords({ records: projects }).find(
    (record) => record.workspace_id === routeProjectId,
  )?.id;
}

function reverseRecords<RecordType>({
  records,
}: {
  records: RecordType[];
}): RecordType[] {
  return [...records].reverse();
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
