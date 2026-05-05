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

    const client = new HttpJsonRpcClient({
      baseUrl: SESSION_URL,
      token: SESSION_TOKEN,
    });

    const unsubscribe = client.onNotification((notification) => {
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
          message: errorMessage(error),
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
          message: errorMessage(error),
        });
      });

    return () => {
      unsubscribe();
      client.close();
    };
  }, [collections]);

  const latestRun = runs.at(-1);
  const runExperiments = experimentsForRun({
    experiments,
    run: latestRun,
  });
  const activeExperiment = runExperiments.find((experiment) => experiment.status === "running");
  const runText = runLabel({
    run: latestRun,
    experimentCount: runExperiments.length,
  });
  const nowText = nowLabel({
    activeExperiment,
    latestRun,
  });

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
        <p>{runText}</p>
      </section>

      <section className="band">
        <h2>Now</h2>
        <p>{nowText}</p>
      </section>

      <section className="band">
        <h2>Experiments</h2>
        <div className="table">
          {runExperiments.length === 0 && <p className="muted">None yet</p>}
          {runExperiments.slice(-12).map((experiment) => (
            <div className="row" key={experiment.id}>
              <span>{experiment.id}</span>
              <span>{experimentState(experiment)}</span>
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
  const label = connectionLabel(state);

  return <span className={`badge ${state.kind}`}>{label}</span>;
}

function connectionLabel(state: ConnectionState): string {
  if (state.kind === "connected") {
    return "Connected";
  }

  if (state.kind === "checking") {
    return "Connecting";
  }

  if (state.kind === "failed") {
    return "Error";
  }

  return "No session";
}

function runLabel({
  run,
  experimentCount,
}: {
  run: RunRecord | undefined;
  experimentCount: number;
}): string {
  if (!run) {
    return "No run yet";
  }

  return `${run.id} | ${run.status} | experiments ${experimentCount}`;
}

function nowLabel({
  activeExperiment,
  latestRun,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestRun: RunRecord | undefined;
}): string {
  if (activeExperiment) {
    return `${activeExperiment.id} | ${activeExperiment.intent}`;
  }

  if (latestRun?.status === "completed") {
    return "Run completed";
  }

  return "Waiting for experiment";
}

function experimentsForRun({
  experiments,
  run,
}: {
  experiments: ExperimentRecord[];
  run: RunRecord | undefined;
}): ExperimentRecord[] {
  if (!run) {
    return [];
  }

  return experiments.filter((experiment) => experiment.run_id === run.id);
}

function experimentState(experiment: ExperimentRecord): string {
  if (experiment.suspicious) {
    return "suspicious";
  }

  return experiment.status;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function sortByCreated<T extends { created_at: string }>(records: T[]): T[] {
  return [...records].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

function sortEvents(records: EventRecord[]): EventRecord[] {
  return [...records].sort((left, right) => left.id - right.id);
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
