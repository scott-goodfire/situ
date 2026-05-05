import { useApp } from "ink";
import { useEffect, useMemo, useRef, useState } from "react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import lodash from "lodash";
import { DateTime } from "luxon";
import {
  applyBootstrap,
  applyCollectionUpsert,
  createAlmanacCollections,
} from "@almanac/collections";
import { HttpJsonRpcClient } from "@almanac/rpc-client/http";
import type {
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
  ObjectiveRecord,
  SessionRecord,
  SessionStartParams,
  SessionStartResult,
  SetupCompleteParams,
  SetupCompleteResult,
  SetupGetParams,
  SetupGetResult,
} from "@almanac/protocol";
import { useLiveQuery } from "@tanstack/react-db";
import {
  AlmanacTuiView,
  ReconnectSessionPrompt,
  type DashboardCommand,
  type DashboardControlMessage,
} from "@almanac/tui-ui";

type Status =
  | { kind: "starting" }
  | { kind: "reconnect"; session: SessionRecord }
  | { kind: "running"; sessionId?: string }
  | { kind: "completed"; sessionId: string }
  | { kind: "failed"; message: string };

export function AlmanacTui() {
  const { exit } = useApp();
  const exitRef = useRef(exit);
  const collections = useMemo(() => createAlmanacCollections(), []);
  const root = useMemo(() => appRoot(), []);
  const workspace = useMemo(() => workspaceRoot({ root }), [root]);
  const maxExperimentCount = useMemo(() => maxExperiments(), []);
  const objectivesQuery = useLiveQuery(
    (query) =>
      query.from({ objective: collections.objectives }).select(({ objective }) => objective),
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

  const objectives = useMemo(
    () => sortByCreated({ records: (objectivesQuery.data ?? []) as ObjectiveRecord[] }),
    [objectivesQuery.data],
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
    const setupParams = initialSetup({
      workspace,
    });
    const sessionUrl = process.env.ALMANAC_SESSION_URL;
    const sessionToken = process.env.ALMANAC_SESSION_TOKEN;

    if (!sessionUrl || !sessionToken) {
      setStatus({
        kind: "failed",
        message: "No local Almanac session found. Start one with almanac start.",
      });
      return;
    }

    const client = new HttpJsonRpcClient({
      baseUrl: sessionUrl,
      token: sessionToken,
    });

    let sessionId: string | undefined;
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
      .request<SetupGetResult, SetupGetParams>({
        method: "setup.get",
        params: {},
      })
      .then((setup) => {
        if (setup.configured) {
          return setup;
        }

        return client
          .request<SetupCompleteResult, SetupCompleteParams>({
            method: "setup.complete",
            params: setupParams,
          })
          .then(() =>
            client.request<SetupGetResult, SetupGetParams>({
              method: "setup.get",
              params: {},
            }),
          );
      })
      .then(() =>
        client.request<CollectionsSubscribeResult, CollectionsSubscribeParams>({
          method: "collections.subscribe",
          params: {},
        }),
      )
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

        const activeSession = lodash.find(
          bootstrap.sessions,
          (session: SessionRecord) => session.status === "active",
        );
        if (activeSession) {
          sessionId = activeSession.id;
          setStatus({ kind: "reconnect", session: activeSession });
          return;
        }

        const result = await client.request<SessionStartResult, SessionStartParams>({
          method: "session.start",
          params: {
            max_experiments: maxExperimentCount,
          },
        });
        sessionId = result.session_id;
        setStatus({ kind: "running", sessionId });
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
    };
  }, [collections, maxExperimentCount, workspace]);

  const activeObjective = lodash.find(
    objectives,
    (objective: ObjectiveRecord) => objective.status === "active",
  );
  const latestSession = sessionForStatus({
    sessions,
    status,
  }) ?? sessions.at(-1);
  const sessionExperiments = experimentsForSession({
    experiments,
    session: latestSession,
  });
  const sessionHypotheses = hypothesesForObjective({
    hypotheses,
    objective: activeObjective,
  });
  const sessionHypothesisActivities = activitiesForSession({
    activities: hypothesisActivities,
    session: latestSession,
  });
  const sessionExperimentActivities = activitiesForSession({
    activities: experimentActivities,
    session: latestSession,
  });
  const sessionEvaluations = evaluationsForSession({
    evaluations,
    session: latestSession,
  });
  const sessionEvaluationActivities = activitiesForSession({
    activities: evaluationActivities,
    session: latestSession,
  });
  const sessionEvents = eventsForSession({
    events,
    session: latestSession,
  });
  const activeExperiment = lodash.find(
    sessionExperiments,
    (experiment: ExperimentRecord) => experiment.status === "active",
  );
  const statusLine = statusSummary({
    status,
    session: latestSession,
    experimentCount: sessionExperiments.length,
    maxExperiments: maxExperimentCount,
  });

  if (status.kind === "reconnect") {
    const reconnectSession = sessionForStatus({
      sessions,
      status,
    }) ?? status.session;
    const reconnectExperiments = experimentsForSession({
      experiments,
      session: reconnectSession,
    });

    return (
      <ReconnectSessionPrompt
        workspace={workspace}
        session={reconnectSession}
        objective={activeObjective}
        experimentCount={reconnectExperiments.length}
        maxExperiments={maxExperimentCount}
        onReconnect={() => {
          setStatus({
            kind: "running",
            sessionId: reconnectSession.id,
          });
        }}
        onQuit={() => {
          exit();
        }}
      />
    );
  }

  return (
    <AlmanacTuiView
      workspace={workspace}
      statusLine={statusLine}
      dashboardMessage={dashboardMessage}
      objective={activeObjective}
      session={latestSession}
      experimentCount={sessionExperiments.length}
      maxExperiments={maxExperimentCount}
      activeExperiment={activeExperiment}
      hypotheses={sessionHypotheses}
      experiments={sessionExperiments}
      evaluations={sessionEvaluations}
      hypothesisActivities={sessionHypothesisActivities}
      experimentActivities={sessionExperimentActivities}
      evaluationActivities={sessionEvaluationActivities}
      events={sessionEvents}
      onDashboardCommand={({ command }) => {
        handleDashboardCommand({
          command,
          exit,
          status,
          session: latestSession,
          experimentCount: sessionExperiments.length,
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
  return resolve(process.env.ALMANAC_APP_ROOT ?? repoRootFromImport());
}

function workspaceRoot({ root }: { root: string }): string {
  return resolve(process.env.ALMANAC_WORKSPACE ?? root);
}

function initialSetup({
  workspace,
}: {
  workspace: string;
}): SetupCompleteParams {
  return {
    objective:
      process.env.ALMANAC_OBJECTIVE ??
      `Observe autoresearch experiments in ${workspace}`,
    research_context: initialResearchContext(),
  };
}

function initialResearchContext(): string {
  const parts: string[] = [];

  if (process.env.ALMANAC_CONTEXT) {
    parts.push(process.env.ALMANAC_CONTEXT);
  }

  parts.push("Capture results, signals, concerns, and activities from local experiments.");

  return parts.join(" ");
}

function maxExperiments(): number {
  const parsed = Number.parseInt(process.env.ALMANAC_MAX_EXPERIMENTS ?? "6", 10);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return 6;
}

function shouldAutoExit(): boolean {
  if (process.env.ALMANAC_TUI_STAY_OPEN === "1") {
    return false;
  }

  return process.env.ALMANAC_TUI_AUTO_EXIT === "1";
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
    return "Connecting to local session...";
  }

  if (status.kind === "failed") {
    return status.message;
  }

  if (status.kind === "reconnect") {
    return "Active session found";
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
  if (status.kind === "reconnect") {
    return status.session.id;
  }

  if (status.kind === "running") {
    return status.sessionId;
  }

  if (status.kind === "completed") {
    return status.sessionId;
  }

  return undefined;
}

function experimentsForSession({
  experiments,
  session,
}: {
  experiments: ExperimentRecord[];
  session: SessionRecord | undefined;
}): ExperimentRecord[] {
  if (!session) {
    return [];
  }

  return lodash.filter(
    experiments,
    (experiment: ExperimentRecord) => experiment.associated_session_id === session.id,
  );
}

function evaluationsForSession({
  evaluations,
  session,
}: {
  evaluations: EvaluationRecord[];
  session: SessionRecord | undefined;
}): EvaluationRecord[] {
  if (!session) {
    return [];
  }

  return lodash.filter(
    evaluations,
    (evaluation: EvaluationRecord) => evaluation.associated_session_id === session.id,
  );
}

function hypothesesForObjective({
  hypotheses,
  objective,
}: {
  hypotheses: HypothesisRecord[];
  objective: ObjectiveRecord | undefined;
}): HypothesisRecord[] {
  if (!objective) {
    return [];
  }

  return lodash.filter(
    hypotheses,
    (hypothesis: HypothesisRecord) => hypothesis.objective_id === objective.id,
  );
}

function activitiesForSession<T extends { session_id?: string | null }>({
  activities,
  session,
}: {
  activities: T[];
  session: SessionRecord | undefined;
}): T[] {
  if (!session) {
    return [];
  }

  return lodash.filter(activities, (activity: T) => activity.session_id === session.id);
}

function eventsForSession({
  events,
  session,
}: {
  events: EventRecord[];
  session: SessionRecord | undefined;
}): EventRecord[] {
  if (!session) {
    return [];
  }

  return lodash.filter(events, (event: EventRecord) => event.session_id === session.id);
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
  return lodash.orderBy(records, [(record: EventRecord) => record.id], ["asc"]);
}

function timestampMillis({ isoTimestamp }: { isoTimestamp: string }): number {
  return DateTime.fromISO(isoTimestamp).toMillis();
}
