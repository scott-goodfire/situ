import {
  ConnectingView,
  FailedConnectionView,
  NoActiveHarnessView,
  UnknownProjectView,
  type ConnectionState,
} from "@situ/web-app-ui";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "@tanstack/react-router";
import { AppShell } from "../../app/app-shell";
import * as s from "../../styles.css";
import { fetchProjectSession } from "../../project-discovery/client";
import type {
  ProjectSummary,
  SessionConnection,
} from "../../project-discovery/types";
import { CommandPaletteProvider } from "../command-palette/command-palette";
import { ProjectWorkspaceProvider } from "../project-workspace/context";
import { ProjectWorkspaceLayout } from "../project-workspace/project-workspace";
import type { ProjectWorkspaceData } from "../project-workspace/types";
import { SessionConnectionProvider } from "./session-connection-context";
import {
  useLiveProjectSession,
  type LiveProjectSessionState,
} from "./use-live-project-session";
import { currentProjectRecordId } from "./project-scope";

export function ProjectMonitor({
  selectedProjectId,
  workspaceId,
}: {
  selectedProjectId?: string;
  workspaceId: string;
}) {
  const sessionQuery = useQuery({
    queryKey: ["project-session", workspaceId],
    queryFn: () => fetchProjectSession({ projectId: workspaceId }),
    refetchInterval: 1_500,
    retry: false,
  });
  const response = sessionQuery.data;
  const discoveryError = sessionQuery.error
    ? errorMessage({ error: sessionQuery.error })
    : undefined;
  const project = response?.project ?? null;

  if (sessionQuery.isPending && !project) {
    return <ConnectingShell workspaceId={workspaceId} />;
  }

  if (!response && discoveryError) {
    return (
      <FailedShell
        workspaceId={workspaceId}
        connection={{ kind: "failed", message: discoveryError }}
      />
    );
  }

  if (!project) {
    return <UnknownProject workspaceId={workspaceId} />;
  }

  if (response?.session) {
    return (
      <LiveProjectSession
        key={sessionKey({ session: response.session })}
        selectedProjectId={selectedProjectId}
        session={response.session}
        workspaceId={workspaceId}
        discoveryError={discoveryError}
      />
    );
  }

  return (
    <ProjectNoActiveHarness
      project={project}
      workspaceId={workspaceId}
      discoveryError={discoveryError}
    />
  );
}

function LiveProjectSession({
  selectedProjectId,
  session,
  workspaceId,
  discoveryError,
}: {
  selectedProjectId?: string;
  session: SessionConnection;
  workspaceId: string;
  discoveryError: string | undefined;
}) {
  const liveSession = useLiveProjectSession({ session });
  const workspaceData = scopedWorkspaceData({
    liveSession,
    selectedProjectId,
    session,
    workspaceId,
  });

  if (!selectedProjectId && workspaceData.activeProjectRecordId) {
    return (
      <Navigate
        to="/workspaces/$workspaceId/projects/$projectId"
        params={{
          workspaceId,
          projectId: workspaceData.activeProjectRecordId,
        }}
        replace
      />
    );
  }

  const content =
    !selectedProjectId && !workspaceData.activeProjectRecordId ? (
      <NoActiveHarnessView
        heading="No session yet"
        description="Start a session from a terminal, then this workspace monitor will fill in live."
      />
    ) : (
      <Outlet />
    );

  return (
    <SessionConnectionProvider session={session}>
      <ProjectWorkspaceProvider data={workspaceData}>
        <CommandPaletteProvider>
          <ProjectWorkspaceLayout data={workspaceData} discoveryError={discoveryError}>
            {content}
          </ProjectWorkspaceLayout>
        </CommandPaletteProvider>
      </ProjectWorkspaceProvider>
    </SessionConnectionProvider>
  );
}

function ProjectNoActiveHarness({
  project,
  workspaceId,
  discoveryError,
}: {
  project: ProjectSummary;
  workspaceId: string;
  discoveryError: string | undefined;
}) {
  const workspace = project.workspace ?? project.project_id;
  const description = project.status_reason
    ? `${project.status_reason} Start a session from a terminal, then reopen this monitor.`
    : "Start a session from a terminal, then reopen this monitor.";

  return (
    <AppShell
      project={{
        workspaceId,
        workspace,
        connection: { kind: "missing" },
      }}
    >
      {discoveryError && (
        <p className={s.status} data-tone="warning">
          {discoveryError}
        </p>
      )}
      <NoActiveHarnessView description={description} />
    </AppShell>
  );
}

function ConnectingShell({
  workspaceId,
  workspace,
}: {
  workspaceId: string;
  workspace?: string;
}) {
  return (
    <AppShell
      project={{
        workspaceId,
        workspace,
        connection: { kind: "checking" },
      }}
    >
      <ConnectingView />
    </AppShell>
  );
}

function FailedShell({
  workspaceId,
  connection,
}: {
  workspaceId: string;
  connection: ConnectionState;
}) {
  const message =
    connection.kind === "failed" || connection.kind === "disconnected"
      ? connection.message
      : undefined;

  return (
    <AppShell project={{ workspaceId, workspace: undefined, connection }}>
      <FailedConnectionView description={message ?? "Discovery API is unavailable."} />
    </AppShell>
  );
}

function UnknownProject({ workspaceId }: { workspaceId: string }) {
  return (
    <AppShell>
      <UnknownProjectView projectId={workspaceId} />
    </AppShell>
  );
}

function sessionKey({ session }: { session: SessionConnection }): string {
  return `${session.workspace_id}:${session.project_id}:${session.started_at}`;
}

function scopedWorkspaceData({
  liveSession,
  selectedProjectId,
  session,
  workspaceId,
}: {
  liveSession: LiveProjectSessionState;
  selectedProjectId?: string;
  session: SessionConnection;
  workspaceId: string;
}): ProjectWorkspaceData {
  const activeProjectRecordId = currentProjectRecordId({
    projects: liveSession.projects,
    selectedProjectId,
    sessionStartedAt: session.started_at,
    sessions: liveSession.sessions,
    workspaceId,
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
    workspaceId,
    projectId: activeProjectRecordId ?? selectedProjectId ?? workspaceId,
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

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
