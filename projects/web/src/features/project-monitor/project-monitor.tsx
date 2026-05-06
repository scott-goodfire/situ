import { DxEmptyState } from "@situ/web-ui";
import type { CollectionsBootstrapResult } from "@situ/protocol";
import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { AppShell } from "../../app/app-shell";
import * as s from "../../styles.css";
import {
  fetchProjectSession,
  fetchProjectSnapshot,
} from "../../project-discovery/client";
import type {
  ProjectSummary,
  SessionConnection,
} from "../../project-discovery/types";
import type { ConnectionState } from "../run-monitor/connection-badge";
import { ProjectWorkspaceProvider } from "../project-workspace/context";
import { ProjectWorkspaceLayout } from "../project-workspace/project-workspace";
import { useLiveProjectSession } from "./use-live-project-session";

export function ProjectMonitor({ projectId }: { projectId: string }) {
  const sessionQuery = useQuery({
    queryKey: ["project-session", projectId],
    queryFn: () => fetchProjectSession({ projectId }),
    refetchInterval: 1_500,
    retry: false,
  });
  const snapshotQuery = useQuery({
    queryKey: ["project-snapshot", projectId],
    queryFn: () => fetchProjectSnapshot({ projectId }),
    refetchInterval: 2_000,
    retry: false,
  });
  const response = sessionQuery.data;
  const snapshotResponse = snapshotQuery.data;
  const discoveryError = sessionQuery.error
    ? errorMessage({ error: sessionQuery.error })
    : undefined;
  const snapshotError = snapshotQuery.error
    ? errorMessage({ error: snapshotQuery.error })
    : undefined;
  const project = response?.project ?? snapshotResponse?.project ?? null;
  const discoveredError = discoveredProblem({
    discoveryError,
    snapshotError,
  });

  if (sessionQuery.isPending && snapshotQuery.isPending && !project) {
    return <ConnectingShell projectId={projectId} />;
  }

  if (!response && !snapshotResponse && discoveredError) {
    return (
      <FailedShell
        projectId={projectId}
        connection={{ kind: "failed", message: discoveredError }}
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
        discoveryError={discoveredError}
      />
    );
  }

  if (snapshotQuery.isPending && !snapshotResponse) {
    return (
      <ConnectingShell
        projectId={projectId}
        workspace={project.workspace ?? project.project_id}
      />
    );
  }

  if (snapshotResponse?.snapshot && snapshotHasRecords(snapshotResponse.snapshot)) {
    return (
      <SnapshotProjectSession
        project={project}
        snapshot={snapshotResponse.snapshot}
        discoveryError={discoveredError}
      />
    );
  }

  return (
    <ProjectNoActiveHarness
      project={project}
      discoveryError={discoveredError}
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
  const workspaceData = {
    projectId,
    workspace: session.workspace,
    connection: liveSession.connection,
    objectives: liveSession.objectives,
    sessions: liveSession.sessions,
    hypotheses: liveSession.hypotheses,
    experiments: liveSession.experiments,
    evaluations: liveSession.evaluations,
    hypothesisExperimentLinks: liveSession.hypothesisExperimentLinks,
    hypothesisActivities: liveSession.hypothesisActivities,
    experimentActivities: liveSession.experimentActivities,
    evaluationActivities: liveSession.evaluationActivities,
    artifacts: liveSession.artifacts,
    events: liveSession.events,
  };

  return (
    <ProjectWorkspaceProvider data={workspaceData}>
      <ProjectWorkspaceLayout data={workspaceData} discoveryError={discoveryError}>
        <Outlet />
      </ProjectWorkspaceLayout>
    </ProjectWorkspaceProvider>
  );
}

function SnapshotProjectSession({
  project,
  snapshot,
  discoveryError,
}: {
  project: ProjectSummary;
  snapshot: CollectionsBootstrapResult;
  discoveryError: string | undefined;
}) {
  const workspaceData = {
    projectId: project.project_id,
    workspace: project.workspace ?? undefined,
    connection: {
      kind: "disconnected",
      message: "Showing latest saved project data. No live session is connected.",
    } as const,
    objectives: snapshot.objectives,
    sessions: snapshot.sessions,
    hypotheses: snapshot.hypotheses,
    experiments: snapshot.experiments,
    evaluations: snapshot.evaluations,
    hypothesisExperimentLinks: snapshot.hypothesis_experiment_links,
    hypothesisActivities: snapshot.hypothesis_activities,
    experimentActivities: snapshot.experiment_activities,
    evaluationActivities: snapshot.evaluation_activities,
    artifacts: snapshot.artifacts,
    events: snapshot.events,
  };

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

function snapshotHasRecords(snapshot: CollectionsBootstrapResult): boolean {
  return (
    snapshot.objectives.length > 0 ||
    snapshot.sessions.length > 0 ||
    snapshot.hypotheses.length > 0 ||
    snapshot.experiments.length > 0 ||
    snapshot.evaluations.length > 0 ||
    snapshot.hypothesis_experiment_links.length > 0 ||
    snapshot.hypothesis_activities.length > 0 ||
    snapshot.experiment_activities.length > 0 ||
    snapshot.evaluation_activities.length > 0 ||
    snapshot.artifacts.length > 0 ||
    snapshot.events.length > 0
  );
}

function discoveredProblem({
  discoveryError,
  snapshotError,
}: {
  discoveryError: string | undefined;
  snapshotError: string | undefined;
}): string | undefined {
  return discoveryError ?? snapshotError;
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
