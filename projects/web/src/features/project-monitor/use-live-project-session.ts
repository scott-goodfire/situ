import { useEffect, useMemo, useState } from "react";
import {
  applyBootstrap,
  applyCollectionUpsert,
  createAlmanacCollections,
} from "@almanac/collections";
import { HttpJsonRpcClient } from "@almanac/rpc-client/http";
import { useLiveQuery } from "@tanstack/react-db";
import orderBy from "lodash/orderBy";
import { DateTime } from "luxon";
import type {
  CollectionUpsertedParams,
  CollectionsBootstrapParams,
  CollectionsBootstrapResult,
  CollectionsSubscribeParams,
  CollectionsSubscribeResult,
  ArtifactRecord,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisExperimentLinkRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";
import type { SessionConnection } from "../../project-discovery/types";
import type { ConnectionState } from "../run-monitor/almanac-monitor";

export type LiveProjectSessionState = {
  connection: ConnectionState;
  objectives: ObjectiveRecord[];
  sessions: SessionRecord[];
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  hypothesisExperimentLinks: HypothesisExperimentLinkRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  artifacts: ArtifactRecord[];
  events: EventRecord[];
};

export function useLiveProjectSession({
  session,
}: {
  session: SessionConnection;
}): LiveProjectSessionState {
  const collections = useMemo(() => createAlmanacCollections(), []);
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
  const hypothesisExperimentLinksQuery = useLiveQuery(
    (query) =>
      query
        .from({ link: collections.hypothesisExperimentLinks })
        .select(({ link }) => link),
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
  const artifactsQuery = useLiveQuery(
    (query) =>
      query.from({ artifact: collections.artifacts }).select(({ artifact }) => artifact),
    [collections],
  );
  const eventsQuery = useLiveQuery(
    (query) => query.from({ event: collections.events }).select(({ event }) => event),
    [collections],
  );
  const [connection, setConnection] = useState<ConnectionState>({ kind: "checking" });

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
  const hypothesisExperimentLinks = useMemo(
    () =>
      sortByCreated({
        records: (hypothesisExperimentLinksQuery.data ??
          []) as HypothesisExperimentLinkRecord[],
      }),
    [hypothesisExperimentLinksQuery.data],
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
  const artifacts = useMemo(
    () => sortByCreated({ records: (artifactsQuery.data ?? []) as ArtifactRecord[] }),
    [artifactsQuery.data],
  );
  const events = useMemo(
    () => sortEvents({ records: (eventsQuery.data ?? []) as EventRecord[] }),
    [eventsQuery.data],
  );

  useEffect(() => {
    let cancelled = false;
    const client = new HttpJsonRpcClient({
      baseUrl: session.url,
      token: session.token,
    });

    const unsubscribe = client.onNotification({
      handler: (notification) => {
        if (cancelled) {
          return;
        }

        if (notification.method === "client.error") {
          const params = notification.params as { message?: string } | undefined;
          setConnection({
            kind: "failed",
            message: params?.message ?? "Session event stream failed",
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

        applyCollectionUpsert({
          collections,
          upsert,
        }).catch((error: unknown) => {
          if (cancelled) {
            return;
          }

          setConnection({
            kind: "failed",
            message: errorMessage({ error }),
          });
        });
      },
    });

    client
      .health()
      .then((healthy) => {
        if (cancelled) {
          return undefined;
        }

        if (!healthy) {
          setConnection({ kind: "missing" });
          return undefined;
        }

        return client.request<CollectionsSubscribeResult, CollectionsSubscribeParams>({
          method: "collections.subscribe",
          params: {},
        });
      })
      .then((subscribed) => {
        if (!subscribed || cancelled) {
          return undefined;
        }

        return client.request<CollectionsBootstrapResult, CollectionsBootstrapParams>({
          method: "collections.bootstrap",
          params: {},
        });
      })
      .then((bootstrap) => {
        if (!bootstrap || cancelled) {
          return undefined;
        }

        return applyBootstrap({
          collections,
          bootstrap,
        });
      })
      .then(() => {
        if (cancelled) {
          return;
        }

        setConnection((current) => {
          if (current.kind !== "checking") {
            return current;
          }

          return { kind: "connected" };
        });
      })
      .catch((error: unknown) => {
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
      unsubscribe();
      client.close();
    };
  }, [collections, session.token, session.url]);

  return {
    connection,
    objectives,
    sessions,
    hypotheses,
    experiments,
    evaluations,
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
