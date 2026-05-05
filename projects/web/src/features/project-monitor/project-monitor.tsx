import { DxBadge, DxNotice } from "@almanac/web-ui";
import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { fetchProjectSession } from "../../project-discovery/client";
import type {
  ProjectSummary,
  SessionConnection,
} from "../../project-discovery/types";
import {
  AlmanacMonitor,
  type ConnectionState,
} from "../run-monitor/almanac-monitor";
import { NoActiveHarness } from "../run-monitor/no-active-harness";
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
  const response = sessionQuery.data;
  const discoveryError = sessionQuery.error
    ? errorMessage({ error: sessionQuery.error })
    : undefined;

  if (sessionQuery.isPending && !response) {
    return (
      <EmptyMonitor
        workspace={undefined}
        connection={{ kind: "checking" }}
      />
    );
  }

  if (!response && discoveryError) {
    return (
      <EmptyMonitor
        workspace={undefined}
        connection={{
          kind: "failed",
          message: discoveryError,
        }}
      />
    );
  }

  if (!response?.project) {
    return <UnknownProject projectId={projectId} />;
  }

  if (!response.session) {
    return (
      <ProjectNoActiveHarness
        project={response.project}
        discoveryError={discoveryError}
      />
    );
  }

  return (
    <LiveProjectSession
      key={sessionKey({ session: response.session })}
      projectId={projectId}
      session={response.session}
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

function ProjectNoActiveHarness({
  project,
  discoveryError,
}: {
  project: ProjectSummary;
  discoveryError: string | undefined;
}) {
  return (
    <>
      <NoActiveHarness workspace={project.workspace ?? project.project_id} />
      {project.status_reason && (
        <aside className="almanac-floating-notice">
          <DxNotice tone={noticeTone({ status: project.status })}>
            {project.status_reason}
          </DxNotice>
        </aside>
      )}
      {discoveryError && (
        <aside className="almanac-floating-notice">
          <DxNotice tone="warning">{discoveryError}</DxNotice>
        </aside>
      )}
    </>
  );
}

function noticeTone({
  status,
}: {
  status: ProjectSummary["status"];
}): "info" | "warning" | "danger" {
  if (status === "unhealthy" || status === "stale") {
    return "danger";
  }

  if (status === "missing_workspace") {
    return "warning";
  }

  return "info";
}

function UnknownProject({ projectId }: { projectId: string }) {
  return (
    <main className="almanac-shell">
      <header className="almanac-topbar">
        <div>
          <h1>Almanac</h1>
          <p>{projectId}</p>
        </div>
        <DxBadge>No project</DxBadge>
      </header>

      <section className="almanac-empty">
        <h2>Project not found</h2>
        <p>No local Almanac project exists with this id.</p>
      </section>
    </main>
  );
}

function EmptyMonitor({
  workspace,
  connection,
}: {
  workspace: string | undefined;
  connection: ConnectionState;
}) {
  return (
    <AlmanacMonitor
      workspace={workspace}
      connection={connection}
      objectives={[]}
      sessions={[]}
      hypotheses={[]}
      experiments={[]}
      experimentActivities={[]}
      events={[]}
    />
  );
}

function sessionKey({ session }: { session: SessionConnection }): string {
  return `${session.url}:${session.started_at}`;
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
