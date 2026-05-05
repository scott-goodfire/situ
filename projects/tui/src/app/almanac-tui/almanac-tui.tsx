import { useApp } from "ink";
import { useEffect, useMemo, useState } from "react";
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
import {
  AlmanacTuiView,
  type CommandMessage,
} from "@almanac/tui-ui";

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

export function AlmanacTui() {
  const { exit } = useApp();
  const collections = useMemo(() => createAlmanacCollections(), []);
  const root = useMemo(() => appRoot(), []);
  const workspace = useMemo(() => workspaceRoot({ root }), [root]);
  const maxExperimentCount = useMemo(() => maxExperiments(), []);
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
  const [commandDraft, setCommandDraft] = useState("");
  const [commandMessage, setCommandMessage] = useState<CommandMessage>({
    tone: "gray",
    text: "Type /help for commands.",
  });

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
      if (closeScheduled || !shouldAutoExit()) {
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

        const activeRun = lodash.find(
          bootstrap.runs,
          (run: RunRecord) => run.status === "running",
        );
        if (activeRun) {
          runId = activeRun.id;
          setStatus({ kind: "running", runId });
          return;
        }

        const result = await client.request<RunStartResult, RunStartParams>({
          method: "run.start",
          params: {
            max_experiments: maxExperimentCount,
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
  }, [collections, exit, maxExperimentCount, root, workspace]);

  const latestRun = runs.at(-1);
  const runExperiments = experimentsForRun({
    experiments,
    run: latestRun,
  });
  const activeExperiment = lodash.find(
    runExperiments,
    (experiment: ExperimentRecord) => experiment.status === "running",
  );
  const statusLine = statusSummary({
    status,
    run: latestRun,
    experimentCount: runExperiments.length,
    maxExperiments: maxExperimentCount,
  });

  return (
    <AlmanacTuiView
      workspace={workspace}
      statusLine={statusLine}
      commandDraft={commandDraft}
      commandMessage={commandMessage}
      run={latestRun}
      experimentCount={runExperiments.length}
      maxExperiments={maxExperimentCount}
      activeExperiment={activeExperiment}
      experiments={runExperiments}
      events={events}
      onCommandChange={({ value }) => {
        setCommandDraft(value);
      }}
      onCommandSubmit={({ value }) => {
        handleCommandSubmit({
          value,
          exit,
          status,
          run: latestRun,
          experimentCount: runExperiments.length,
          maxExperiments: maxExperimentCount,
          setCommandDraft,
          setCommandMessage,
        });
      }}
    />
  );
}

function handleCommandSubmit({
  value,
  exit,
  status,
  run,
  experimentCount,
  maxExperiments,
  setCommandDraft,
  setCommandMessage,
}: {
  value: string;
  exit: () => void;
  status: Status;
  run: RunRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  setCommandDraft: (value: string) => void;
  setCommandMessage: (value: CommandMessage) => void;
}) {
  const command = value.trim();
  setCommandDraft("");

  if (!command) {
    return;
  }

  if (command === "/quit" || command === "q") {
    exit();
    return;
  }

  if (command === "/help") {
    setCommandMessage({
      tone: "gray",
      text: "Commands: /status, /help, /quit",
    });
    return;
  }

  if (command === "/status") {
    setCommandMessage({
      tone: "cyan",
      text: statusSummary({
        status,
        run,
        experimentCount,
        maxExperiments,
      }),
    });
    return;
  }

  setCommandMessage({
    tone: "yellow",
    text: `Unknown command: ${command}. Try /help.`,
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

  return lodash.compact(value.split(",").map((signal) => signal.trim()));
}

function maxExperiments(): number {
  const parsed = Number.parseInt(process.env.ALMANAC_MAX_EXPERIMENTS ?? "5", 10);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return 5;
}

function shouldAutoExit(): boolean {
  if (process.env.ALMANAC_TUI_STAY_OPEN === "1") {
    return false;
  }

  return process.env.ALMANAC_TUI_AUTO_EXIT === "1";
}

function statusSummary({
  status,
  run,
  experimentCount,
  maxExperiments,
}: {
  status: Status;
  run: RunRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}): string {
  if (status.kind === "starting") {
    return "Connecting to local session...";
  }

  if (status.kind === "failed") {
    return status.message;
  }

  if (!run && status.kind === "running") {
    return `Running ${status.runId ?? "new run"}...`;
  }

  if (!run && status.kind === "completed") {
    return `Completed ${status.runId}`;
  }

  if (!run) {
    return "Waiting for run...";
  }

  return `${run.id} | ${run.status} | experiments ${experimentCount}/${maxExperiments}`;
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

  return lodash.filter(
    experiments,
    (experiment: ExperimentRecord) => experiment.run_id === run.id,
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
  return lodash.orderBy(records, [(record: EventRecord) => record.id], ["asc"]);
}

function timestampMillis({ isoTimestamp }: { isoTimestamp: string }): number {
  return DateTime.fromISO(isoTimestamp).toMillis();
}
