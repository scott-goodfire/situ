import { Box, render, Text, useApp } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyBootstrap,
  applyCollectionUpsert,
  createAlmanacCollections,
} from "@almanac/collections";
import { StdioJsonRpcClient } from "@almanac/rpc-client";
import type {
  CollectionUpsertedParams,
  CollectionsBootstrapParams,
  CollectionsBootstrapResult,
  CollectionsSubscribeParams,
  CollectionsSubscribeResult,
  EventRecord,
  EvidenceRecord,
  ExperimentRecord,
  FindingRecord,
  RunRecord,
  RunStartParams,
  RunStartResult,
  SetupCompleteParams,
  SetupCompleteResult,
  SetupGetParams,
  SetupGetResult,
  StateSnapshotParams,
  StateSnapshotResult,
  WarningRecord,
} from "@almanac/protocol";
import { useLiveQuery } from "@tanstack/react-db";

type Status =
  | { kind: "starting" }
  | { kind: "running"; runId?: string }
  | { kind: "completed"; runId: string }
  | { kind: "failed"; message: string };

const EMPTY_SNAPSHOT: StateSnapshotResult = {
  config: null,
  runs: [],
  experiments: [],
  evidence: [],
  findings: [],
  warnings: [],
  events: [],
};

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

function workspaceRoot(root: string): string {
  return resolve(process.env.ALMANAC_WORKSPACE ?? root);
}

function harnessCommand(root: string): { command: string; args: string[] } {
  const localHarness = resolve(root, ".venv/bin/almanac-harness-stdio");
  if (existsSync(localHarness)) {
    return { command: localHarness, args: [] };
  }

  return {
    command: "uv",
    args: ["run", "--package", "almanac-harness", "almanac-harness-stdio"],
  };
}

function initialSetup(workspace: string, root: string): SetupCompleteParams {
  const knownSignals = parseSignals(process.env.ALMANAC_KNOWN_SIGNALS);
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
    evaluation_context:
      process.env.ALMANAC_EVALUATION_CONTEXT ??
      (process.env.ALMANAC_EVAL_COMMAND
        ? `Run ${process.env.ALMANAC_EVAL_COMMAND} and capture its JSON signals.`
        : "Capture evidence, signals, warnings, and findings from local experiments."),
    known_signals: knownSignals,
    experiment_scope:
      process.env.ALMANAC_EXPERIMENT_SCOPE ??
      "Run the current local worker path and compare evidence across baseline, individual changes, and combinations.",
  };
}

function parseSignals(value: string | undefined): string[] {
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
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 5;
}

function App() {
  const { exit } = useApp();
  const collections = useMemo(() => createAlmanacCollections(), []);
  const runsQuery = useLiveQuery(() => collections.runs, [collections]);
  const experimentsQuery = useLiveQuery(() => collections.experiments, [collections]);
  const eventsQuery = useLiveQuery(() => collections.events, [collections]);
  const [status, setStatus] = useState<Status>({ kind: "starting" });
  const [snapshot, setSnapshot] = useState<StateSnapshotResult>(EMPTY_SNAPSHOT);

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
    const root = appRoot();
    const workspace = workspaceRoot(root);
    const harness = harnessCommand(root);
    const client = StdioJsonRpcClient.spawn(harness.command, harness.args, workspace, {
      ALMANAC_APP_ROOT: root,
      ALMANAC_WORKSPACE: workspace,
    });
    let runId: string | undefined;
    let closed = false;
    let closeScheduled = false;
    let unsubscribe = () => {};

    const closeAfterCompletedRun = () => {
      if (closeScheduled || process.env.ALMANAC_TUI_STAY_OPEN === "1") {
        return;
      }
      closeScheduled = true;
      setTimeout(() => {
        closed = true;
        unsubscribe();
        client.close();
        exit();
      }, 1400);
    };

    const handleRunRecord = (run: RunRecord) => {
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

    const refreshSnapshot = async () => {
      const next = await client.request<StateSnapshotResult, StateSnapshotParams>(
        "state.snapshot",
        {},
      );
      setSnapshot(next);

      if (!runId) {
        return;
      }
      const run = next.runs.find((candidate) => candidate.id === runId);
      if (run) {
        handleRunRecord(run);
      }
    };

    unsubscribe = client.onNotification((notification) => {
      if (notification.method !== "collections.upserted") {
        return;
      }
      const upsert = notification.params as CollectionUpsertedParams | undefined;
      if (!upsert) {
        return;
      }
      applyCollectionUpsert(collections, upsert).catch((error: unknown) => {
        setStatus({
          kind: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      });
      if (upsert.collection === "runs") {
        handleRunRecord(upsert.record as unknown as RunRecord);
        return;
      }
      if (upsert.collection === "events") {
        refreshSnapshot().catch(() => undefined);
      }
    });

    client
      .request<SetupGetResult, SetupGetParams>("setup.get", {})
      .then((setup) => {
        if (setup.configured) {
          return setup;
        }
        return client
          .request<SetupCompleteResult, SetupCompleteParams>("setup.complete", initialSetup(workspace, root))
          .then(() => client.request<SetupGetResult, SetupGetParams>("setup.get", {}));
      })
      .then(() =>
        client.request<CollectionsSubscribeResult, CollectionsSubscribeParams>(
          "collections.subscribe",
          {},
        ),
      )
      .then(() =>
        client.request<CollectionsBootstrapResult, CollectionsBootstrapParams>(
          "collections.bootstrap",
          {},
        ),
      )
      .then((bootstrap) => applyBootstrap(collections, bootstrap))
      .then(() => refreshSnapshot())
      .then(() =>
        client.request<RunStartResult, RunStartParams>("run.start", {
          max_experiments: maxExperiments(),
        }),
      )
      .then((result) => {
        runId = result.run_id;
        setStatus({ kind: "running", runId });
        return refreshSnapshot();
      })
      .catch((error: unknown) => {
        setStatus({
          kind: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    const interval = setInterval(() => {
      if (!closed) {
        refreshSnapshot().catch((error: unknown) => {
          setStatus({
            kind: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }, 250);

    return () => {
      closed = true;
      clearInterval(interval);
      unsubscribe();
      client.close();
    };
  }, [collections, exit]);

  const latestRun = runs.at(-1);
  const runExperiments = latestRun
    ? experiments.filter((experiment) => experiment.run_id === latestRun.id)
    : [];
  const runEvidence = latestRun
    ? snapshot.evidence.filter((evidence) => evidence.run_id === latestRun.id)
    : [];
  const runFindings = latestRun
    ? snapshot.findings.filter((finding) => finding.run_id === latestRun.id)
    : [];
  const runWarnings = latestRun
    ? snapshot.warnings.filter((warning) => warning.run_id === latestRun.id)
    : [];
  const activeExperiment = runExperiments.find((experiment) => experiment.status === "running");
  const baseline = runEvidence.find((evidence) => evidence.experiment_id.endsWith("_baseline"));

  const evidenceByExperiment = useMemo(() => {
    const map = new Map<string, EvidenceRecord>();
    for (const evidence of runEvidence) {
      map.set(evidence.experiment_id, evidence);
    }
    return map;
  }, [runEvidence]);

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Almanac
        </Text>
        {status.kind === "starting" && <Text>Starting local harness...</Text>}
        {status.kind === "running" && (
          <Text color="yellow">Running {status.runId ?? "new run"}...</Text>
        )}
        {status.kind === "completed" && <Text color="green">Completed {status.runId}</Text>}
        {status.kind === "failed" && <Text color="red">{status.message}</Text>}
      </Box>

      <Section title="Goal">
        <Text>{snapshot.config?.goal ?? "Configuring context..."}</Text>
        <Text dimColor>Workspace: {snapshot.config?.repo_path ?? process.env.ALMANAC_WORKSPACE ?? "unknown"}</Text>
      </Section>

      <Section title="Evaluation">
        <Text>
          Signals: {snapshot.config?.known_signals.length ? snapshot.config.known_signals.join(", ") : "unknown"}
        </Text>
        <Text>Baseline: {baseline ? formatSignals(baseline.signals) : "waiting"}</Text>
      </Section>

      <Section title="Run">
        <Text>{latestRun ? formatRun(latestRun, runExperiments.length) : "No run yet"}</Text>
      </Section>

      <Section title="Now">
        <Text>
          {activeExperiment
            ? `${activeExperiment.id} | ${activeExperiment.intent}`
            : latestRun?.status === "completed"
              ? "Run completed"
              : "Waiting for experiment"}
        </Text>
      </Section>

      <Section title="Findings">
        {runFindings.length === 0 && <Text dimColor>Waiting for evidence</Text>}
        {runFindings.slice(-5).map((finding) => (
          <Text key={finding.id}>{formatFinding(finding)}</Text>
        ))}
      </Section>

      <Section title="Experiments">
        {runExperiments.length === 0 && <Text dimColor>None yet</Text>}
        {runExperiments.slice(-8).map((experiment) => (
          <Text key={experiment.id}>{formatExperiment(experiment, evidenceByExperiment.get(experiment.id))}</Text>
        ))}
      </Section>

      <Section title="Warnings">
        {runWarnings.length === 0 && <Text dimColor>none</Text>}
        {runWarnings.slice(-4).map((warning) => (
          <Text key={warning.id} color="yellow">
            {formatWarning(warning)}
          </Text>
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

function formatRun(run: RunRecord, experimentCount: number): string {
  return `${run.id} | ${run.status} | experiments ${experimentCount}`;
}

function formatFinding(finding: FindingRecord): string {
  return `${displayFindingId(finding.id)} | ${finding.status} | ${finding.confidence} | ${finding.summary}`;
}

function displayFindingId(id: string): string {
  const match = id.match(/(F-\d+)$/);
  return match?.[1] ?? id;
}

function formatExperiment(experiment: ExperimentRecord, evidence?: EvidenceRecord): string {
  const state = experiment.suspicious ? "suspicious" : experiment.status;
  const signals = evidence ? formatSignals(evidence.signals) : "-";
  const components = experiment.components.join("+");
  const note = experiment.suspicious_reason ?? experiment.note;
  return `${experiment.id} | ${state} | ${components} | ${signals} | ${note || experiment.intent}`;
}

function formatSignals(signals: Array<{ key: string; value: unknown; unit?: string | null }>): string {
  if (signals.length === 0) {
    return "-";
  }
  return signals.map((signal) => `${signal.key}=${String(signal.value)}${signal.unit ?? ""}`).join(", ");
}

function formatWarning(warning: WarningRecord): string {
  return `${warning.kind}: ${warning.message}`;
}

function sortByCreated<T extends { created_at: string }>(records: T[]): T[] {
  return [...records].sort((left, right) => left.created_at.localeCompare(right.created_at));
}

function sortEvents(records: EventRecord[]): EventRecord[] {
  return [...records].sort((left, right) => left.id - right.id);
}

render(<App />);
