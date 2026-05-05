import { Box, render, Text, useApp } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  ExperimentRecord,
  RunRecord,
  RunStartParams,
  RunStartResult,
  SetupCompleteParams,
  SetupCompleteResult,
  SetupGetParams,
  SetupGetResult,
} from "@almanac/protocol";
import { useLiveQuery } from "@tanstack/react-db";

type Status =
  | { kind: "starting" }
  | { kind: "running"; runId?: string }
  | { kind: "completed"; runId: string }
  | { kind: "failed"; message: string };

const TOY_SETUP: SetupCompleteParams = {
  goal: "Understand which toy components improve score without suspicious evidence.",
  evaluation_context:
    "Toy deterministic eval with score and latency signals. The harness should preserve evidence, derive findings, and flag suspicious evidence shape changes.",
  known_signals: ["score", "latency_ms"],
  experiment_scope: "Try baseline, individual toy components, combinations, and one suspicious result.",
};

function repoRootFromImport(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../..");
}

function appRoot(): string {
  return resolve(process.env.ALMANAC_APP_ROOT ?? repoRootFromImport());
}

function workspaceRoot({ root }: { root: string }): string {
  return resolve(process.env.ALMANAC_WORKSPACE ?? root);
}

function initialSetup({
  workspace,
  root,
}: {
  workspace: string;
  root: string;
}): SetupCompleteParams {
  const knownSignals = parseSignals({ value: process.env.ALMANAC_KNOWN_SIGNALS });
  const hasUserSetup =
    Boolean(process.env.ALMANAC_GOAL) ||
    Boolean(process.env.ALMANAC_EVALUATION_CONTEXT) ||
    Boolean(process.env.ALMANAC_EXPERIMENT_SCOPE) ||
    knownSignals.length > 0 ||
    Boolean(process.env.ALMANAC_EVAL_COMMAND);

  if (!hasUserSetup && workspace === root) {
    return TOY_SETUP;
  }

  return {
    goal: process.env.ALMANAC_GOAL ?? `Observe autoresearch experiments in ${workspace}`,
    evaluation_context: initialEvaluationContext(),
    known_signals: knownSignals,
    experiment_scope:
      process.env.ALMANAC_EXPERIMENT_SCOPE ??
      "Run the current local worker path and compare evidence across baseline, individual changes, and combinations.",
  };
}

function initialEvaluationContext(): string {
  if (process.env.ALMANAC_EVALUATION_CONTEXT) {
    return process.env.ALMANAC_EVALUATION_CONTEXT;
  }

  if (process.env.ALMANAC_EVAL_COMMAND) {
    return `Run ${process.env.ALMANAC_EVAL_COMMAND} and capture its JSON signals.`;
  }

  return "Capture evidence, signals, warnings, and findings from local experiments.";
}

function parseSignals({ value }: { value: string | undefined }): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((signal) => signal.trim())
    .filter((signal) => signal.length > 0);
}

function maxExperiments(): number {
  const parsed = Number.parseInt(process.env.ALMANAC_MAX_EXPERIMENTS ?? "5", 10);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return 5;
}

function App() {
  const { exit } = useApp();
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
  const [status, setStatus] = useState<Status>({ kind: "starting" });

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
    const root = appRoot();
    const workspace = workspaceRoot({ root });
    const setupParams = initialSetup({
      workspace,
      root,
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

    let runId: string | undefined;
    let closeScheduled = false;
    let unsubscribe = () => {};

    const closeAfterCompletedRun = () => {
      if (closeScheduled || process.env.ALMANAC_TUI_STAY_OPEN === "1") {
        return;
      }
      closeScheduled = true;
      setTimeout(() => {
        unsubscribe();
        client.close();
        exit();
      }, 1400);
    };

    const handleRunRecord = ({ run }: { run: RunRecord }) => {
      if (!runId || run.id !== runId) {
        return;
      }
      if (run.status === "completed") {
        setStatus({ kind: "completed", runId });
        closeAfterCompletedRun();
      }
      if (run.status === "failed") {
        setStatus({ kind: "failed", message: `Run ${run.id} failed` });
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

        if (upsert.collection === "runs") {
          handleRunRecord({ run: upsert.record as unknown as RunRecord });
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

        const activeRun = bootstrap.runs.find((run) => run.status === "running");
        if (activeRun) {
          runId = activeRun.id;
          setStatus({ kind: "running", runId });
          return;
        }

        const result = await client.request<RunStartResult, RunStartParams>({
          method: "run.start",
          params: {
            max_experiments: maxExperiments(),
          },
        });
        runId = result.run_id;
        setStatus({ kind: "running", runId });
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
  }, [collections, exit]);

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

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Almanac
        </Text>
        {status.kind === "starting" && <Text>Connecting to local session...</Text>}
        {status.kind === "running" && (
          <Text color="yellow">Running {status.runId ?? "new run"}...</Text>
        )}
        {status.kind === "completed" && <Text color="green">Completed {status.runId}</Text>}
        {status.kind === "failed" && <Text color="red">{status.message}</Text>}
      </Box>

      <Section title="Run">
        <Text>{runText}</Text>
      </Section>

      <Section title="Now">
        <Text>{nowText}</Text>
      </Section>

      <Section title="Experiments">
        {runExperiments.length === 0 && <Text dimColor>None yet</Text>}
        {runExperiments.slice(-8).map((experiment) => (
          <Text key={experiment.id}>{formatExperiment({ experiment })}</Text>
        ))}
      </Section>

      <Section title="Timeline">
        {events.length === 0 && <Text dimColor>No events yet</Text>}
        {events.slice(-8).map((event) => (
          <Text key={event.id}>
            <Text color="gray">#{event.id}</Text> {event.type}: {event.message}
          </Text>
        ))}
      </Section>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      {children}
    </Box>
  );
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

function formatExperiment({ experiment }: { experiment: ExperimentRecord }): string {
  const state = experimentState({ experiment });
  const components = experiment.components.join("+");
  const note = experiment.suspicious_reason ?? experiment.note;

  return `${experiment.id} | ${state} | ${components} | ${note || experiment.intent}`;
}

function experimentState({ experiment }: { experiment: ExperimentRecord }): string {
  if (experiment.suspicious) {
    return "suspicious";
  }

  return experiment.status;
}

function errorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function sortByCreated<T extends { created_at: string }>({ records }: { records: T[] }): T[] {
  return [...records].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

function sortEvents({ records }: { records: EventRecord[] }): EventRecord[] {
  return [...records].sort((left, right) => left.id - right.id);
}

render(<App />);
