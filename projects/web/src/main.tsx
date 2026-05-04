import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  applyBootstrap,
  applyCollectionUpsert,
  createAlmanacCollections,
} from "@almanac/collections";
import { HttpJsonRpcClient } from "@almanac/rpc-client/http";
import { useLiveQuery } from "@tanstack/react-db";
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
import "./styles.css";

type ConnectionState =
  | { kind: "checking" }
  | { kind: "connected" }
  | { kind: "missing" }
  | { kind: "failed"; message: string };

const SESSION_URL = import.meta.env.VITE_ALMANAC_SESSION_URL as string | undefined;
const SESSION_TOKEN = import.meta.env.VITE_ALMANAC_SESSION_TOKEN as string | undefined;
const WORKSPACE = import.meta.env.VITE_ALMANAC_WORKSPACE as string | undefined;

function App() {
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
    () => sortByCreated((runsQuery.data ?? []) as RunRecord[]),
    [runsQuery.data],
  );
  const experiments = useMemo(
    () => sortByCreated((experimentsQuery.data ?? []) as ExperimentRecord[]),
    [experimentsQuery.data],
  );
  const events = useMemo(
    () => sortEvents((eventsQuery.data ?? []) as EventRecord[]),
    [eventsQuery.data],
  );

  useEffect(() => {
    if (!SESSION_URL || !SESSION_TOKEN) {
      setConnection({ kind: "missing" });
      return;
    }

    const client = new HttpJsonRpcClient(SESSION_URL, SESSION_TOKEN);
    const unsubscribe = client.onNotification((notification) => {
      if (notification.method !== "collections.upserted") {
        return;
      }
      const upsert = notification.params as CollectionUpsertedParams | undefined;
      if (!upsert) {
        return;
      }
      applyCollectionUpsert(collections, upsert).catch((error: unknown) => {
        setConnection({
          kind: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    });

    client
      .health()
      .then((healthy) => {
        if (!healthy) {
          setConnection({ kind: "missing" });
          return undefined;
        }
        return client.request<CollectionsSubscribeResult, CollectionsSubscribeParams>(
          "collections.subscribe",
          {},
        );
      })
      .then((subscribed) => {
        if (!subscribed) {
          return undefined;
        }
        return client.request<CollectionsBootstrapResult, CollectionsBootstrapParams>(
          "collections.bootstrap",
          {},
        );
      })
      .then((bootstrap) => {
        if (!bootstrap) {
          return;
        }
        return applyBootstrap(collections, bootstrap);
      })
      .then(() => {
        setConnection((current) => (current.kind === "checking" ? { kind: "connected" } : current));
      })
      .catch((error: unknown) => {
        setConnection({
          kind: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      unsubscribe();
      client.close();
    };
  }, [collections]);

  const latestRun = runs.at(-1);
  const runExperiments = latestRun
    ? experiments.filter((experiment) => experiment.run_id === latestRun.id)
    : [];
  const activeExperiment = runExperiments.find((experiment) => experiment.status === "running");

  if (connection.kind === "missing") {
    return <NoSession />;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Almanac</h1>
          <p>{WORKSPACE ?? "Local workspace"}</p>
        </div>
        <ConnectionBadge state={connection} />
      </header>

      {connection.kind === "failed" && <div className="notice">{connection.message}</div>}

      <section className="band">
        <h2>Run</h2>
        <p>{latestRun ? formatRun(latestRun, runExperiments.length) : "No run yet"}</p>
      </section>

      <section className="band">
        <h2>Now</h2>
        <p>
          {activeExperiment
            ? `${activeExperiment.id} | ${activeExperiment.intent}`
            : latestRun?.status === "completed"
              ? "Run completed"
              : "Waiting for experiment"}
        </p>
      </section>

      <section className="band">
        <h2>Experiments</h2>
        <div className="table">
          {runExperiments.length === 0 && <p className="muted">None yet</p>}
          {runExperiments.slice(-12).map((experiment) => (
            <div className="row" key={experiment.id}>
              <span>{experiment.id}</span>
              <span>{experiment.suspicious ? "suspicious" : experiment.status}</span>
              <span>{experiment.components.join("+")}</span>
              <span>{experiment.suspicious_reason ?? (experiment.note || experiment.intent)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <h2>Timeline</h2>
        <div className="timeline">
          {events.length === 0 && <p className="muted">No events yet</p>}
          {events.slice(-14).map((event) => (
            <div className="event" key={event.id}>
              <span>#{event.id}</span>
              <span>{event.type}</span>
              <span>{event.message}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function NoSession() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Almanac</h1>
          <p>{WORKSPACE ?? "Local workspace"}</p>
        </div>
        <span className="badge">No session</span>
      </header>
      <section className="empty">
        <h2>No active Almanac harness found</h2>
        <p>Start a session from a terminal, then reopen this web monitor.</p>
        <pre>almanac start</pre>
      </section>
    </main>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const label =
    state.kind === "connected"
      ? "Connected"
      : state.kind === "checking"
        ? "Connecting"
        : state.kind === "failed"
          ? "Error"
          : "No session";
  return <span className={`badge ${state.kind}`}>{label}</span>;
}

function formatRun(run: RunRecord, experimentCount: number): string {
  return `${run.id} | ${run.status} | experiments ${experimentCount}`;
}

function sortByCreated<T extends { created_at: string }>(records: T[]): T[] {
  return [...records].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

function sortEvents(records: EventRecord[]): EventRecord[] {
  return [...records].sort((left, right) => left.id - right.id);
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
