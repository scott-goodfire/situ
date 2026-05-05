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
  EventRecord,
  ExperimentRecord,
  RunRecord,
} from "@almanac/protocol";
import {
  AlmanacMonitor,
  type ConnectionState,
} from "../features/run-monitor/almanac-monitor";

const SESSION_URL = import.meta.env.VITE_ALMANAC_SESSION_URL as string | undefined;
const SESSION_TOKEN = import.meta.env.VITE_ALMANAC_SESSION_TOKEN as string | undefined;
const WORKSPACE = import.meta.env.VITE_ALMANAC_WORKSPACE as string | undefined;

export function AlmanacApp() {
  const collections = useMemo(() => createAlmanacCollections(), []);
  const runsQuery = useLiveQuery(
    (query) => query.from({ run: collections.runs }).select(({ run }) => run),
    [collections],
  );
  const experimentsQuery = useLiveQuery(
    (query) =>
      query
        .from({ experiment: collections.experiments })
        .select(({ experiment }) => experiment),
    [collections],
  );
  const eventsQuery = useLiveQuery(
    (query) => query.from({ event: collections.events }).select(({ event }) => event),
    [collections],
  );
  const [connection, setConnection] = useState<ConnectionState>({ kind: "checking" });

  const runs = useMemo(
    () => sortByCreated({ records: (runsQuery.data ?? []) as RunRecord[] }),
    [runsQuery.data],
  );
  const experiments = useMemo(
    () => sortByCreated({ records: (experimentsQuery.data ?? []) as ExperimentRecord[] }),
    [experimentsQuery.data],
  );
  const events = useMemo(
    () => sortEvents({ records: (eventsQuery.data ?? []) as EventRecord[] }),
    [eventsQuery.data],
  );

  useEffect(() => {
    if (!SESSION_URL || !SESSION_TOKEN) {
      setConnection({ kind: "missing" });
      return;
    }

    const client = new HttpJsonRpcClient({
      baseUrl: SESSION_URL,
      token: SESSION_TOKEN,
    });

    const unsubscribe = client.onNotification({
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
        if (!subscribed) {
          return undefined;
        }

        return client.request<CollectionsBootstrapResult, CollectionsBootstrapParams>({
          method: "collections.bootstrap",
          params: {},
        });
      })
      .then((bootstrap) => {
        if (!bootstrap) {
          return;
        }

        return applyBootstrap({
          collections,
          bootstrap,
        });
      })
      .then(() => {
        setConnection((current) => {
          if (current.kind !== "checking") {
            return current;
          }

          return { kind: "connected" };
        });
      })
      .catch((error: unknown) => {
        setConnection({
          kind: "failed",
          message: errorMessage({ error }),
        });
      });

    return () => {
      unsubscribe();
      client.close();
    };
  }, [collections]);

  return (
    <AlmanacMonitor
      workspace={WORKSPACE}
      connection={connection}
      runs={runs}
      experiments={experiments}
      events={events}
    />
  );
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
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
