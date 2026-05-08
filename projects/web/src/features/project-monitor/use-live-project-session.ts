import { useEffect, useMemo, useState } from "react";
import {
  bootstrapCollectionSync,
  createCollectionSynchronizer,
  createSituCollections,
  isCollectionCursorGapError,
  recoverCollectionSubscription,
} from "@situ/collections";
import { HttpJsonRpcClient } from "@situ/rpc-client/http";
import { useLiveQuery } from "@tanstack/react-db";
import orderBy from "lodash/orderBy";
import { DateTime } from "luxon";
import type { ConnectionState } from "@situ/web-app-ui";
import type {
  AgentRecord,
  AnalysisActivityRecord,
  AnalysisRecord,
  CollectionUpsertedParams,
  ArtifactRecord,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisExperimentLinkRecord,
  HypothesisRecord,
  ProjectRecord,
  SessionRecord,
  TaskActivityRecord,
  TaskDependencyRecord,
  TaskEntityLinkRecord,
  TaskRecord,
} from "@situ/protocol";
import type { SessionConnection } from "../../project-discovery/types";

export type LiveProjectSessionState = {
  connection: ConnectionState;
  projects: ProjectRecord[];
  sessions: SessionRecord[];
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  analyses: AnalysisRecord[];
  agents: AgentRecord[];
  tasks: TaskRecord[];
  taskDependencies: TaskDependencyRecord[];
  taskEntityLinks: TaskEntityLinkRecord[];
  taskActivities: TaskActivityRecord[];
  analysisActivities: AnalysisActivityRecord[];
  hypothesisExperimentLinks: HypothesisExperimentLinkRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  artifacts: ArtifactRecord[];
  events: EventRecord[];
};

const COLLECTION_RECOVERY_POLL_MS = 5000;

export function useLiveProjectSession({
  session,
}: {
  session: SessionConnection;
}): LiveProjectSessionState {
  const collections = useMemo(() => createSituCollections(), []);
  const collectionSynchronizer = useMemo(
    () => createCollectionSynchronizer({ collections }),
    [collections],
  );
  const projectsQuery = useLiveQuery(
    () => collections.projects,
    [collections],
  );
  const sessionsQuery = useLiveQuery(
    () => collections.sessions,
    [collections],
  );
  const hypothesesQuery = useLiveQuery(
    () => collections.hypotheses,
    [collections],
  );
  const experimentsQuery = useLiveQuery(
    () => collections.experiments,
    [collections],
  );
  const evaluationsQuery = useLiveQuery(
    () => collections.evaluations,
    [collections],
  );
  const analysesQuery = useLiveQuery(
    () => collections.analyses,
    [collections],
  );
  const agentsQuery = useLiveQuery(
    () => collections.agents,
    [collections],
  );
  const tasksQuery = useLiveQuery(
    () => collections.tasks,
    [collections],
  );
  const taskDependenciesQuery = useLiveQuery(
    () => collections.taskDependencies,
    [collections],
  );
  const taskEntityLinksQuery = useLiveQuery(
    () => collections.taskEntityLinks,
    [collections],
  );
  const taskActivitiesQuery = useLiveQuery(
    () => collections.taskActivities,
    [collections],
  );
  const analysisActivitiesQuery = useLiveQuery(
    () => collections.analysisActivities,
    [collections],
  );
  const hypothesisExperimentLinksQuery = useLiveQuery(
    () => collections.hypothesisExperimentLinks,
    [collections],
  );
  const hypothesisActivitiesQuery = useLiveQuery(
    () => collections.hypothesisActivities,
    [collections],
  );
  const experimentActivitiesQuery = useLiveQuery(
    () => collections.experimentActivities,
    [collections],
  );
  const evaluationActivitiesQuery = useLiveQuery(
    () => collections.evaluationActivities,
    [collections],
  );
  const artifactsQuery = useLiveQuery(
    () => collections.artifacts,
    [collections],
  );
  const eventsQuery = useLiveQuery(
    () => collections.events,
    [collections],
  );
  const [connection, setConnection] = useState<ConnectionState>({ kind: "checking" });

  const projects = useMemo(
    () => sortByCreated({ records: projectsQuery.data ?? [] }),
    [projectsQuery.data],
  );
  const sessions = useMemo(
    () => sortByCreated({ records: sessionsQuery.data ?? [] }),
    [sessionsQuery.data],
  );
  const hypotheses = useMemo(
    () => sortByCreated({ records: hypothesesQuery.data ?? [] }),
    [hypothesesQuery.data],
  );
  const experiments = useMemo(
    () => sortByCreated({ records: experimentsQuery.data ?? [] }),
    [experimentsQuery.data],
  );
  const evaluations = useMemo(
    () => sortByCreated({ records: evaluationsQuery.data ?? [] }),
    [evaluationsQuery.data],
  );
  const analyses = useMemo(
    () => sortByCreated({ records: analysesQuery.data ?? [] }),
    [analysesQuery.data],
  );
  const agents = useMemo(
    () => sortByCreated({ records: agentsQuery.data ?? [] }),
    [agentsQuery.data],
  );
  const tasks = useMemo(
    () => sortByCreated({ records: tasksQuery.data ?? [] }),
    [tasksQuery.data],
  );
  const taskDependencies = useMemo(
    () => taskDependenciesQuery.data ?? [],
    [taskDependenciesQuery.data],
  );
  const taskEntityLinks = useMemo(
    () => taskEntityLinksQuery.data ?? [],
    [taskEntityLinksQuery.data],
  );
  const taskActivities = useMemo(
    () =>
      sortByCreated({
        records: taskActivitiesQuery.data ?? [],
      }),
    [taskActivitiesQuery.data],
  );
  const analysisActivities = useMemo(
    () =>
      sortByCreated({
        records: analysisActivitiesQuery.data ?? [],
      }),
    [analysisActivitiesQuery.data],
  );
  const hypothesisExperimentLinks = useMemo(
    () =>
      sortByCreated({
        records: hypothesisExperimentLinksQuery.data ?? [],
      }),
    [hypothesisExperimentLinksQuery.data],
  );
  const hypothesisActivities = useMemo(
    () =>
      sortByCreated({
        records: hypothesisActivitiesQuery.data ?? [],
      }),
    [hypothesisActivitiesQuery.data],
  );
  const experimentActivities = useMemo(
    () =>
      sortByCreated({
        records: experimentActivitiesQuery.data ?? [],
      }),
    [experimentActivitiesQuery.data],
  );
  const evaluationActivities = useMemo(
    () =>
      sortByCreated({
        records: evaluationActivitiesQuery.data ?? [],
      }),
    [evaluationActivitiesQuery.data],
  );
  const artifacts = useMemo(
    () => sortByCreated({ records: artifactsQuery.data ?? [] }),
    [artifactsQuery.data],
  );
  const events = useMemo(
    () => sortEvents({ records: eventsQuery.data ?? [] }),
    [eventsQuery.data],
  );

  useEffect(() => {
    let cancelled = false;
    let recoveryQueue = Promise.resolve();
    let initialSyncReady = false;
    let recoveryTimer: ReturnType<typeof setInterval> | undefined;
    const client = new HttpJsonRpcClient({
      baseUrl: window.location.origin,
      workspace: session.workspace,
      projectId: session.project_id,
    });

    const scheduleRecovery = ({
      message,
      reconnect,
      resubscribe = true,
      showDisconnected = true,
    }: {
      message: string;
      reconnect: boolean;
      resubscribe?: boolean;
      showDisconnected?: boolean;
    }) => {
      recoveryQueue = recoveryQueue
        .then(async () => {
          if (cancelled) {
            return;
          }

          if (showDisconnected) {
            setConnection({ kind: "disconnected", message });
          }
          await recoverCollectionSubscription({
            client,
            synchronizer: collectionSynchronizer,
            reconnect,
            resubscribe,
          });

          if (!cancelled) {
            setConnection((current) => {
              if (
                showDisconnected ||
                current.kind === "failed" ||
                current.kind === "disconnected"
              ) {
                return { kind: "connected" };
              }
              return current;
            });
          }
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }

          setConnection({
            kind: "failed",
            message: showDisconnected
              ? errorMessage({ error })
              : `${message}: ${errorMessage({ error })}`,
          });
        });
    };

    recoveryTimer = setInterval(() => {
      if (cancelled || !initialSyncReady) {
        return;
      }

      scheduleRecovery({
        message: "Collection sync check failed",
        reconnect: false,
        resubscribe: false,
        showDisconnected: false,
      });
    }, COLLECTION_RECOVERY_POLL_MS);

    const unsubscribe = client.onNotification({
      handler: (notification) => {
        if (cancelled) {
          return;
        }

        if (notification.method === "client.error") {
          const params = notification.params as { message?: string } | undefined;
          scheduleRecovery({
            message: params?.message ?? "Session event stream failed",
            reconnect: true,
          });
          return;
        }

        if (notification.method !== "collections.upserted") {
          return;
        }

        const upsert = notification.params as CollectionUpsertedParams | undefined;
        if (!upsert) {
          return;
        }

        collectionSynchronizer.applyUpsert(upsert).catch((error: unknown) => {
          if (cancelled) {
            return;
          }

          if (isCollectionCursorGapError(error)) {
            scheduleRecovery({
              message: error.message,
              reconnect: false,
            });
            return;
          }

          setConnection({
            kind: "failed",
            message: errorMessage({ error }),
          });
        });
      },
    });

    void (async () => {
      const healthy = await client.health();
      if (cancelled) {
        return;
      }

      if (!healthy) {
        setConnection({ kind: "missing" });
        return;
      }

      await bootstrapCollectionSync({
        client,
        synchronizer: collectionSynchronizer,
      });

      if (cancelled) {
        return;
      }

      initialSyncReady = true;
      setConnection((current) => {
        if (current.kind !== "checking") {
          return current;
        }

        return { kind: "connected" };
      });
    })().catch((error: unknown) => {
      if (cancelled) {
        return;
      }
      setConnection({
        kind: "failed",
        message: errorMessage({ error }),
      });
    });

    return () => {
      cancelled = true;
      if (recoveryTimer) {
        clearInterval(recoveryTimer);
      }
      unsubscribe();
      client.close();
    };
  }, [
    collectionSynchronizer,
    session.project_id,
    session.workspace,
  ]);

  return {
    connection,
    projects,
    sessions,
    hypotheses,
    experiments,
    evaluations,
    analyses,
    agents,
    tasks,
    taskDependencies,
    taskEntityLinks,
    taskActivities,
    analysisActivities,
    hypothesisExperimentLinks,
    hypothesisActivities,
    experimentActivities,
    evaluationActivities,
    artifacts,
    events,
  };
}

function sortByCreated<T extends { created_at: string }>({ records }: { records: T[] }): T[] {
  return orderBy(
    records,
    [(record) => timestampMillis({ isoTimestamp: record.created_at })],
    ["asc"],
  );
}

function sortEvents({ records }: { records: EventRecord[] }): EventRecord[] {
  return orderBy(records, [(record) => record.id], ["asc"]);
}

function timestampMillis({ isoTimestamp }: { isoTimestamp: string }): number {
  return DateTime.fromISO(isoTimestamp).toMillis();
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
