import { useApp } from "ink";
import { useEffect, useMemo, useRef, useState } from "react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import lodash from "lodash";
import { DateTime } from "luxon";
import {
  applyBootstrap,
  applyCollectionUpsert,
  createSituCollections,
} from "@situ/collections";
import { HttpJsonRpcClient } from "@situ/rpc-client/http";
import type {
  AgentRecord,
  CollectionUpsertedParams,
  CollectionsBootstrapParams,
  CollectionsBootstrapResult,
  CollectionsSubscribeParams,
  CollectionsSubscribeResult,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ProjectRecord,
  SessionRecord,
  SessionResumeParams,
  SessionResumeResult,
  SessionStartParams,
  SessionStartResult,
  TaskActivityRecord,
  TaskRecord,
} from "@situ/protocol";
import { useLiveQuery } from "@tanstack/react-db";
import {
  SituTuiView,
  StartSessionPrompt,
  type DashboardCommand,
  type DashboardControlMessage,
} from "@situ/tui-ui";

type Status =
  | { kind: "starting" }
  | { kind: "ready" }
  | { kind: "launching" }
  | { kind: "running"; sessionId?: string }
  | { kind: "completed"; sessionId: string }
  | { kind: "failed"; message: string };

type SessionMode = "start" | "resume" | "attach";

export function SituTui() {
  const { exit } = useApp();
  const exitRef = useRef(exit);
  const collections = useMemo(() => createSituCollections(), []);
  const root = useMemo(() => appRoot(), []);
  const workspace = useMemo(() => workspaceRoot({ root }), [root]);
  const maxExperimentCount = useMemo(() => maxExperiments(), []);
  const sessionStartParams = useMemo(
    () =>
      initialSessionStartParams({
        workspace,
        maxExperimentCount,
      }),
    [maxExperimentCount, workspace],
  );
  const clientRef = useRef<HttpJsonRpcClient | undefined>(undefined);
  const trackedSessionIdRef = useRef<string | undefined>(undefined);
  const projectsQuery = useLiveQuery(
    (query) =>
      query.from({ project: collections.projects }).select(({ project }) => project),
    [collections],
  );
  const sessionsQuery = useLiveQuery(
    (query) =>
      query.from({ session: collections.sessions }).select(({ session }) => session),
    [collections],
  );
  const hypothesesQuery = useLiveQuery(
    (query) =>
      query
        .from({ hypothesis: collections.hypotheses })
        .select(({ hypothesis }) => hypothesis),
    [collections],
  );
  const experimentsQuery = useLiveQuery(
    (query) =>
      query
        .from({ experiment: collections.experiments })
        .select(({ experiment }) => experiment),
    [collections],
  );
  const evaluationsQuery = useLiveQuery(
    (query) =>
      query
        .from({ evaluation: collections.evaluations })
        .select(({ evaluation }) => evaluation),
    [collections],
  );
  const agentsQuery = useLiveQuery(
    (query) =>
      query.from({ agent: collections.agents }).select(({ agent }) => agent),
    [collections],
  );
  const tasksQuery = useLiveQuery(
    (query) => query.from({ task: collections.tasks }).select(({ task }) => task),
    [collections],
  );
  const taskActivitiesQuery = useLiveQuery(
    (query) =>
      query
        .from({ activity: collections.taskActivities })
        .select(({ activity }) => activity),
    [collections],
  );
  const hypothesisActivitiesQuery = useLiveQuery(
    (query) =>
      query
        .from({ activity: collections.hypothesisActivities })
        .select(({ activity }) => activity),
    [collections],
  );
  const experimentActivitiesQuery = useLiveQuery(
    (query) =>
      query
        .from({ activity: collections.experimentActivities })
        .select(({ activity }) => activity),
    [collections],
  );
  const evaluationActivitiesQuery = useLiveQuery(
    (query) =>
      query
        .from({ activity: collections.evaluationActivities })
        .select(({ activity }) => activity),
    [collections],
  );
  const eventsQuery = useLiveQuery(
    (query) => query.from({ event: collections.events }).select(({ event }) => event),
    [collections],
  );
  const [status, setStatus] = useState<Status>({ kind: "starting" });
  const [dashboardMessage, setDashboardMessage] = useState<
    DashboardControlMessage | undefined
  >(undefined);

  useEffect(() => {
    exitRef.current = exit;
  }, [exit]);

  const projects = useMemo(
    () => sortByCreated({ records: (projectsQuery.data ?? []) as ProjectRecord[] }),
    [projectsQuery.data],
  );
  const sessions = useMemo(
    () => sortByCreated({ records: (sessionsQuery.data ?? []) as SessionRecord[] }),
    [sessionsQuery.data],
  );
  const hypotheses = useMemo(
    () => sortByCreated({ records: (hypothesesQuery.data ?? []) as HypothesisRecord[] }),
    [hypothesesQuery.data],
  );
  const experiments = useMemo(
    () => sortByCreated({ records: (experimentsQuery.data ?? []) as ExperimentRecord[] }),
    [experimentsQuery.data],
  );
  const evaluations = useMemo(
    () => sortByCreated({ records: (evaluationsQuery.data ?? []) as EvaluationRecord[] }),
    [evaluationsQuery.data],
  );
  const agents = useMemo(
    () => sortByCreated({ records: (agentsQuery.data ?? []) as AgentRecord[] }),
    [agentsQuery.data],
  );
  const tasks = useMemo(
    () => sortByCreated({ records: (tasksQuery.data ?? []) as TaskRecord[] }),
    [tasksQuery.data],
  );
  const taskActivities = useMemo(
    () =>
      sortByCreated({
        records: (taskActivitiesQuery.data ?? []) as TaskActivityRecord[],
      }),
    [taskActivitiesQuery.data],
  );
  const hypothesisActivities = useMemo(
    () =>
      sortByCreated({
        records: (hypothesisActivitiesQuery.data ?? []) as HypothesisActivityRecord[],
      }),
    [hypothesisActivitiesQuery.data],
  );
  const experimentActivities = useMemo(
    () =>
      sortByCreated({
        records: (experimentActivitiesQuery.data ?? []) as ExperimentActivityRecord[],
      }),
    [experimentActivitiesQuery.data],
  );
  const evaluationActivities = useMemo(
    () =>
      sortByCreated({
        records: (evaluationActivitiesQuery.data ?? []) as EvaluationActivityRecord[],
      }),
    [evaluationActivitiesQuery.data],
  );
  const events = useMemo(
    () => sortEvents({ records: (eventsQuery.data ?? []) as EventRecord[] }),
    [eventsQuery.data],
  );

  useEffect(() => {
    const mode = sessionMode();
    const sessionUrl = process.env.SITU_APP_URL ?? process.env.SITU_SESSION_URL;
    const sessionToken = process.env.SITU_APP_TOKEN ?? process.env.SITU_SESSION_TOKEN;
    const projectId = process.env.SITU_PROJECT_ID;

    if (!sessionUrl || !sessionToken) {
      setStatus({
        kind: "failed",
        message: "No local Situ app found. Start one with situ app.",
      });
      return;
    }

    const client = new HttpJsonRpcClient({
      baseUrl: sessionUrl,
      token: sessionToken,
      workspace,
      projectId,
    });
    clientRef.current = client;
    trackedSessionIdRef.current = undefined;

    let closeScheduled = false;
    let unsubscribe = () => {};

    const closeAfterCompletedSession = () => {
      if (closeScheduled || !shouldAutoExit()) {
        return;
      }

      closeScheduled = true;
      setTimeout(() => {
        unsubscribe();
        client.close();
        exitRef.current();
      }, 1400);
    };

    const handleSessionRecord = ({ session }: { session: SessionRecord }) => {
      const sessionId = trackedSessionIdRef.current;
      if (!sessionId || session.id !== sessionId) {
        return;
      }

      if (session.status === "closed") {
        setStatus({ kind: "completed", sessionId });
        closeAfterCompletedSession();
      }
    };

    unsubscribe = client.onNotification({
      handler: (notification) => {
        if (notification.method !== "collections.upserted") {
          return;
        }

        const upsert = notification.params as CollectionUpsertedParams | undefined;
        if (!upsert) {
          return;
        }

        applyCollectionUpsert({
          collections,
          upsert,
        }).catch((error: unknown) => {
          setStatus({
            kind: "failed",
            message: errorMessage({ error }),
          });
        });

        if (upsert.collection === "sessions") {
          handleSessionRecord({ session: upsert.record as unknown as SessionRecord });
        }
      },
    });

    client
      .request<CollectionsSubscribeResult, CollectionsSubscribeParams>({
        method: "collections.subscribe",
        params: {},
      })
      .then(() =>
        client.request<CollectionsBootstrapResult, CollectionsBootstrapParams>({
          method: "collections.bootstrap",
          params: {},
        }),
      )
      .then(async (bootstrap) => {
        await applyBootstrap({
          collections,
          bootstrap,
        });

        if (mode === "attach") {
          const activeSession = latestActiveSession({ sessions: bootstrap.sessions });
          if (!activeSession) {
            throw new Error("No active session found. Start or resume Situ first.");
          }

          trackedSessionIdRef.current = activeSession.id;
          setStatus({ kind: "running", sessionId: activeSession.id });
          return;
        }

        if (mode === "resume") {
          const resumeSession = sessionToResume({ sessions: bootstrap.sessions });
          if (!resumeSession) {
            throw new Error("No session found to resume.");
          }

          const result = await client.request<SessionResumeResult, SessionResumeParams>({
            method: "session.resume",
            params: {
              session_id: resumeSession.id,
              max_experiments: maxExperimentCount,
            },
          });
          trackedSessionIdRef.current = result.session_id;
          setStatus({ kind: "running", sessionId: result.session_id });
          return;
        }

        setStatus({ kind: "launching" });
        const result = await client.request<SessionStartResult, SessionStartParams>({
          method: "session.start",
          params: sessionStartParams,
        });
        trackedSessionIdRef.current = result.session_id;
        setStatus({ kind: "running", sessionId: result.session_id });
      })
      .catch((error: unknown) => {
        setStatus({
          kind: "failed",
          message: errorMessage({ error }),
        });
      });

    return () => {
      unsubscribe();
      client.close();
      if (clientRef.current === client) {
        clientRef.current = undefined;
      }
    };
  }, [collections, maxExperimentCount, sessionStartParams, workspace]);

  const latestSession = sessionForStatus({
    sessions,
    status,
  });
  const activeProject =
    projectForSession({
      projects,
      session: latestSession,
    }) ?? latestActiveProject({ projects });
  const activeProjectId = latestSession?.project_id ?? activeProject?.id;
  const projectAgents = agentsForProject({
    agents,
    projectId: activeProjectId,
  });
  const projectTasks = tasksForProject({
    tasks,
    projectId: activeProjectId,
  });
  const projectTaskActivities = taskActivitiesForProject({
    activities: taskActivities,
    projectId: activeProjectId,
  });
  const projectExperiments = experimentsForProject({
    experiments,
    projectId: activeProjectId,
  });
  const projectHypotheses = hypothesesForProject({
    hypotheses,
    projectId: activeProjectId,
  });
  const projectHypothesisActivities = hypothesisActivitiesForProject({
    activities: hypothesisActivities,
    hypotheses: projectHypotheses,
  });
  const projectExperimentActivities = experimentActivitiesForProject({
    activities: experimentActivities,
    experiments: projectExperiments,
  });
  const projectEvaluations = evaluationsForProject({
    evaluations,
    projectId: activeProjectId,
  });
  const projectEvaluationActivities = evaluationActivitiesForProject({
    activities: evaluationActivities,
    evaluations: projectEvaluations,
  });
  const projectEvents = eventsForProject({
    events,
    projectId: activeProjectId,
    session: latestSession,
  });
  const statusLine = statusSummary({
    status,
    session: latestSession,
    experimentCount: projectExperiments.length,
    maxExperiments: maxExperimentCount,
  });
  const handleStartSession = () => {
    const client = clientRef.current;
    if (!client) {
      setStatus({
        kind: "failed",
        message: "No local Situ session client is available.",
      });
      return;
    }

    setStatus({ kind: "launching" });
    client
      .request<SessionStartResult, SessionStartParams>({
        method: "session.start",
        params: sessionStartParams,
      })
      .then((result) => {
        trackedSessionIdRef.current = result.session_id;
        setStatus({
          kind: "running",
          sessionId: result.session_id,
        });
      })
      .catch((error: unknown) => {
        setStatus({
          kind: "failed",
          message: errorMessage({ error }),
        });
      });
  };

  if (status.kind === "ready") {
    return (
      <StartSessionPrompt
        workspace={workspace}
        params={sessionStartParams}
        onStart={handleStartSession}
        onExit={() => {
          exit();
        }}
      />
    );
  }

  return (
    <SituTuiView
      workspace={workspace}
      statusLine={statusLine}
      dashboardMessage={dashboardMessage}
      project={activeProject}
      session={latestSession}
      agents={projectAgents}
      tasks={projectTasks}
      experimentCount={projectExperiments.length}
      maxExperiments={maxExperimentCount}
      hypotheses={projectHypotheses}
      experiments={projectExperiments}
      evaluations={projectEvaluations}
      taskActivities={projectTaskActivities}
      hypothesisActivities={projectHypothesisActivities}
      experimentActivities={projectExperimentActivities}
      evaluationActivities={projectEvaluationActivities}
      events={projectEvents}
      onDashboardCommand={({ command }) => {
        handleDashboardCommand({
          command,
          exit,
          status,
          session: latestSession,
          experimentCount: projectExperiments.length,
          maxExperiments: maxExperimentCount,
          setDashboardMessage,
        });
      }}
    />
  );
}

function handleDashboardCommand({
  command,
  exit,
  status,
  session,
  experimentCount,
  maxExperiments,
  setDashboardMessage,
}: {
  command: DashboardCommand;
  exit: () => void;
  status: Status;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  setDashboardMessage: (value: DashboardControlMessage) => void;
}) {
  if (command === "quit") {
    exit();
    return;
  }

  if (command === "help") {
    setDashboardMessage({
      tone: "gray",
      text: "Keys: ? help, : commands, q quit. The dashboard is read-only while the session runs.",
    });
    return;
  }

  setDashboardMessage({
    tone: "cyan",
    text: statusSummary({
      status,
      session,
      experimentCount,
      maxExperiments,
    }),
  });
}

function repoRootFromImport(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../../../..");
}

function appRoot(): string {
  return resolve(process.env.SITU_APP_ROOT ?? repoRootFromImport());
}

function workspaceRoot({ root }: { root: string }): string {
  return resolve(process.env.SITU_WORKSPACE ?? root);
}

function initialSessionStartParams({
  workspace,
  maxExperimentCount,
}: {
  workspace: string;
  maxExperimentCount: number;
}): SessionStartParams {
  return {
    objective:
      process.env.SITU_OBJECTIVE ??
      `Explore autoresearch opportunities in ${workspace}`,
    research_context: initialResearchContext(),
    max_experiments: maxExperimentCount,
  };
}

function initialResearchContext(): string {
  const parts: string[] = [];

  if (process.env.SITU_CONTEXT) {
    parts.push(process.env.SITU_CONTEXT);
  }

  parts.push(
    "Use project-native tools, tests, evals, benchmarks, logs, and artifacts. " +
      "Capture plaintext evidence, useful interpretations, concerns, and activities.",
  );

  return parts.join(" ");
}

function sessionMode(): SessionMode {
  const rawMode = process.env.SITU_SESSION_MODE;
  if (rawMode === "resume") {
    return "resume";
  }

  if (rawMode === "attach") {
    return "attach";
  }

  return "start";
}

function maxExperiments(): number {
  const parsed = Number.parseInt(process.env.SITU_MAX_EXPERIMENTS ?? "6", 10);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return 6;
}

function shouldAutoExit(): boolean {
  if (process.env.SITU_TUI_STAY_OPEN === "1") {
    return false;
  }

  return process.env.SITU_TUI_AUTO_EXIT === "1";
}

function statusSummary({
  status,
  session,
  experimentCount,
  maxExperiments,
}: {
  status: Status;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}): string {
  if (status.kind === "starting") {
    return "Connecting to local app...";
  }

  if (status.kind === "ready") {
    return "Ready to start";
  }

  if (status.kind === "launching") {
    return "Starting session...";
  }

  if (status.kind === "failed") {
    return status.message;
  }

  if (!session && status.kind === "running") {
    return `Running ${status.sessionId ?? "new session"}...`;
  }

  if (!session && status.kind === "completed") {
    return `Completed ${status.sessionId}`;
  }

  if (!session) {
    return "Waiting for session...";
  }

  return `${session.id} | ${session.status} | experiments ${experimentCount}/${maxExperiments}`;
}

function sessionForStatus({
  sessions,
  status,
}: {
  sessions: SessionRecord[];
  status: Status;
}): SessionRecord | undefined {
  const sessionId = sessionIdForStatus({ status });
  if (!sessionId) {
    return undefined;
  }

  return lodash.find(sessions, (session: SessionRecord) => session.id === sessionId);
}

function sessionIdForStatus({ status }: { status: Status }): string | undefined {
  if (status.kind === "running") {
    return status.sessionId;
  }

  if (status.kind === "completed") {
    return status.sessionId;
  }

  return undefined;
}

function sessionToResume({
  sessions,
}: {
  sessions: SessionRecord[];
}): SessionRecord | undefined {
  const requestedSessionId = process.env.SITU_RESUME_SESSION_ID;
  if (requestedSessionId) {
    return lodash.find(
      sessions,
      (session: SessionRecord) => session.id === requestedSessionId,
    );
  }

  return latestSessionRecord({ sessions });
}

function latestActiveSession({
  sessions,
}: {
  sessions: SessionRecord[];
}): SessionRecord | undefined {
  const activeSessions = lodash.filter(
    sessions,
    (session: SessionRecord) => session.status === "active",
  );
  return latestSessionRecord({ sessions: activeSessions });
}

function latestSessionRecord({
  sessions,
}: {
  sessions: SessionRecord[];
}): SessionRecord | undefined {
  return sortByCreated({ records: sessions }).at(-1);
}

function projectForSession({
  projects,
  session,
}: {
  projects: ProjectRecord[];
  session: SessionRecord | undefined;
}): ProjectRecord | undefined {
  if (!session?.project_id) {
    return undefined;
  }

  return lodash.find(
    projects,
    (project: ProjectRecord) => project.id === session.project_id,
  );
}

function latestActiveProject({
  projects,
}: {
  projects: ProjectRecord[];
}): ProjectRecord | undefined {
  const activeProjects = lodash.filter(
    projects,
    (project: ProjectRecord) => project.status === "active",
  );

  return sortByCreated({ records: activeProjects }).at(-1) ?? projects.at(-1);
}

function agentsForProject({
  agents,
  projectId,
}: {
  agents: AgentRecord[];
  projectId: string | undefined;
}): AgentRecord[] {
  if (!projectId) {
    return [];
  }

  return lodash.filter(
    agents,
    (agent: AgentRecord) => agent.project_id === projectId,
  );
}

function tasksForProject({
  tasks,
  projectId,
}: {
  tasks: TaskRecord[];
  projectId: string | undefined;
}): TaskRecord[] {
  if (!projectId) {
    return [];
  }

  return lodash.orderBy(
    lodash.filter(tasks, (task: TaskRecord) => task.project_id === projectId),
    [
      (task: TaskRecord) => task.available_at,
      (task: TaskRecord) => task.created_at,
      (task: TaskRecord) => task.id,
    ],
    ["asc", "asc", "asc"],
  );
}

function taskActivitiesForProject({
  activities,
  projectId,
}: {
  activities: TaskActivityRecord[];
  projectId: string | undefined;
}): TaskActivityRecord[] {
  if (!projectId) {
    return [];
  }

  return lodash.filter(
    activities,
    (activity: TaskActivityRecord) => activity.project_id === projectId,
  );
}

function experimentsForProject({
  experiments,
  projectId,
}: {
  experiments: ExperimentRecord[];
  projectId: string | undefined;
}): ExperimentRecord[] {
  if (!projectId) {
    return [];
  }

  return lodash.filter(
    experiments,
    (experiment: ExperimentRecord) => experiment.project_id === projectId,
  );
}

function evaluationsForProject({
  evaluations,
  projectId,
}: {
  evaluations: EvaluationRecord[];
  projectId: string | undefined;
}): EvaluationRecord[] {
  if (!projectId) {
    return [];
  }

  return lodash.filter(
    evaluations,
    (evaluation: EvaluationRecord) => evaluation.project_id === projectId,
  );
}

function hypothesesForProject({
  hypotheses,
  projectId,
}: {
  hypotheses: HypothesisRecord[];
  projectId: string | undefined;
}): HypothesisRecord[] {
  if (!projectId) {
    return [];
  }

  return lodash.filter(
    hypotheses,
    (hypothesis: HypothesisRecord) => hypothesis.project_id === projectId,
  );
}

function hypothesisActivitiesForProject({
  activities,
  hypotheses,
}: {
  activities: HypothesisActivityRecord[];
  hypotheses: HypothesisRecord[];
}): HypothesisActivityRecord[] {
  const hypothesisIds = new Set(hypotheses.map((hypothesis) => hypothesis.id));

  return lodash.filter(activities, (activity: HypothesisActivityRecord) =>
    hypothesisIds.has(activity.hypothesis_id),
  );
}

function experimentActivitiesForProject({
  activities,
  experiments,
}: {
  activities: ExperimentActivityRecord[];
  experiments: ExperimentRecord[];
}): ExperimentActivityRecord[] {
  const experimentIds = new Set(experiments.map((experiment) => experiment.id));

  return lodash.filter(activities, (activity: ExperimentActivityRecord) =>
    experimentIds.has(activity.experiment_id),
  );
}

function evaluationActivitiesForProject({
  activities,
  evaluations,
}: {
  activities: EvaluationActivityRecord[];
  evaluations: EvaluationRecord[];
}): EvaluationActivityRecord[] {
  const evaluationIds = new Set(evaluations.map((evaluation) => evaluation.id));

  return lodash.filter(activities, (activity: EvaluationActivityRecord) =>
    evaluationIds.has(activity.evaluation_id),
  );
}

function eventsForProject({
  events,
  projectId,
  session,
}: {
  events: EventRecord[];
  projectId: string | undefined;
  session: SessionRecord | undefined;
}): EventRecord[] {
  if (!projectId && !session) {
    return [];
  }

  return lodash.filter(
    events,
    (event: EventRecord) =>
      (projectId !== undefined && event.associated_project_id === projectId) ||
      (session !== undefined && event.associated_session_id === session.id),
  );
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function sortByCreated<T extends { created_at: string }>({ records }: { records: T[] }): T[] {
  return lodash.orderBy(
    records,
    [(record: T) => timestampMillis({ isoTimestamp: record.created_at })],
    ["asc"],
  );
}

function sortEvents({ records }: { records: EventRecord[] }): EventRecord[] {
  return lodash.orderBy(
    records,
    [
      (record: EventRecord) => timestampMillis({ isoTimestamp: record.created_at }),
      (record: EventRecord) => record.id,
    ],
    ["asc", "asc"],
  );
}

function timestampMillis({ isoTimestamp }: { isoTimestamp: string }): number {
  return DateTime.fromISO(isoTimestamp).toMillis();
}
