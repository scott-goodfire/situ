import { ensureRuntimeContext } from "../config/session-context";
import type { SessionRuntimeContext } from "../config/session-context";
import { defaultRuntimeHost, defaultRuntimePort } from "../config/runtime";
import { recordAppEvent } from "../app-events";
import { computeTargetRepository } from "../data/repositories/compute-targets";
import { commandLineModule } from "../modules/command-line";
import { printResult } from "./__shared__";
import { seedSessionObjective, waitForAutomationUntilIdle } from "../runtime/automation";
import type { AutomationProgress } from "../runtime/automation";
import { CUDA_VISIBLE_DEVICES_METADATA_KEY } from "../runtime/compute";
import { hasAnthropicKey } from "../secrets/local-secret-store";

export type ExecLifecycleHandle = {
  webUrl?: string;
  teardown: () => Promise<void>;
};

export type ExecLifecycleHook = (args: {
  runtime: SessionRuntimeContext;
  server: ExecServerOptions;
}) => Promise<ExecLifecycleHandle>;

export type ExecServerOptions = {
  host: string;
  port: number;
  allowPortFallback: boolean;
};

type AutomationCommandOptions = {
  objective?: string;
  sessionId?: string;
  server: ExecServerOptions;
  json: boolean;
  compute?: ExecComputeOptions;
};

type ExecCommandOptions = AutomationCommandOptions & {
  timeoutSeconds: number;
};

type ExecComputeOptions = {
  pool: string;
  kind: string;
  label?: string;
  cudaVisibleDevices?: string;
};

type ExecResearchProject = Awaited<ReturnType<typeof seedSessionObjective>>["researchProject"];
type ExecAutomationSummary = Awaited<ReturnType<typeof waitForAutomationUntilIdle>>;
type ExecComputeTarget = Awaited<ReturnType<typeof computeTargetRepository.upsert>>;

export async function runExecCommand({
  argv,
  beforeAutomation,
}: {
  argv: string[];
  beforeAutomation?: ExecLifecycleHook;
}): Promise<number> {
  const options = parseExecOptions({ argv });
  await assertExecCanRun({ options });
  const runtime = await ensureRuntimeContext(runtimeContextOptions({ options }));
  const lifecycle = beforeAutomation
    ? await beforeAutomation({ runtime, server: options.server })
    : undefined;
  try {
    const computeTarget = await registerExecComputeTarget({ options });
    printExecStart({ runtime, lifecycle, computeTarget });
    const researchProject = await seedObjectiveForExec({ options });
    const summary = await runExecAutomation({ options });
    printExecResult({ options, runtime, lifecycle, researchProject, summary, computeTarget });
    return exitCodeFromExecSummary({ summary });
  } finally {
    await teardownExecLifecycle({ lifecycle });
  }
}

async function assertExecCanRun({ options }: { options: ExecCommandOptions }): Promise<void> {
  if (!options.objective && !options.sessionId) {
    throw new Error("objective is required unless --session is provided");
  }
  if (!(await hasAnthropicKey())) {
    throw new Error("SITU_ANTHROPIC_KEY is required for headless exec.");
  }
  if (options.compute && !options.objective) {
    throw new Error(
      "compute options are only supported when launching a fresh situ exec objective.",
    );
  }
}

function runtimeContextOptions({ options }: { options: ExecCommandOptions }): {
  sessionId?: string;
} {
  return {
    sessionId: options.sessionId,
  };
}

async function seedObjectiveForExec({
  options,
}: {
  options: ExecCommandOptions;
}): Promise<ExecResearchProject | undefined> {
  if (!options.objective) {
    return undefined;
  }
  const result = await seedSessionObjective({
    objective: options.objective,
    executionMode: "headless",
  });
  return result.researchProject;
}

async function registerExecComputeTarget({
  options,
}: {
  options: ExecCommandOptions;
}): Promise<ExecComputeTarget | undefined> {
  if (!options.compute) {
    return undefined;
  }
  const target = await computeTargetRepository.upsert({
    pool: options.compute.pool,
    kind: options.compute.kind,
    label: options.compute.label,
    metadata: execComputeMetadata({ compute: options.compute }),
  });
  await recordAppEvent({
    type: "compute_target.upserted",
    message: `Compute target registered by situ exec: ${target.id}`,
    payload: { computeTargetId: target.id, pool: target.pool },
  });
  return target;
}

function execComputeMetadata({
  compute,
}: {
  compute: ExecComputeOptions;
}): Record<string, unknown> {
  if (!compute.cudaVisibleDevices) {
    return {};
  }
  return {
    [CUDA_VISIBLE_DEVICES_METADATA_KEY]: compute.cudaVisibleDevices,
  };
}

function runExecAutomation({
  options,
}: {
  options: ExecCommandOptions;
}): Promise<ExecAutomationSummary> {
  return waitForAutomationUntilIdle({
    timeoutSeconds: options.timeoutSeconds,
    onProgress: options.json ? undefined : createPrintProgress(),
    autoConfirmBaselines: true,
  });
}

function printExecResult({
  options,
  runtime,
  lifecycle,
  researchProject,
  summary,
  computeTarget,
}: {
  options: ExecCommandOptions;
  runtime: SessionRuntimeContext;
  lifecycle: ExecLifecycleHandle | undefined;
  researchProject: ExecResearchProject | undefined;
  summary: ExecAutomationSummary;
  computeTarget: ExecComputeTarget | undefined;
}): void {
  printResult({
    json: options.json,
    value: {
      sessionId: runtime.sessionId,
      webUrl: lifecycle?.webUrl ?? null,
      computeTarget: computeTarget ?? null,
      researchProject,
      summary,
    },
    text: execResultText({ runtime, summary }),
  });
}

function printExecStart({
  runtime,
  lifecycle,
  computeTarget,
}: {
  runtime: SessionRuntimeContext;
  lifecycle: ExecLifecycleHandle | undefined;
  computeTarget: ExecComputeTarget | undefined;
}): void {
  console.error("[situ-exec] Running headless automation");
  if (lifecycle?.webUrl) {
    console.error(`[situ-exec] Web UI: ${lifecycle.webUrl}`);
  }
  console.error(`[situ-exec] Session: ${runtime.sessionId}`);
  if (computeTarget) {
    console.error(
      `[situ-exec] Compute target: ${computeTarget.id} pool=${computeTarget.pool} label=${computeTarget.label ?? ""}`,
    );
  }
}

function exitCodeFromExecSummary({ summary }: { summary: ExecAutomationSummary }): number {
  if (summary.status === "idle") {
    return 0;
  }
  if (summary.status === "blocked_on_user") {
    return 3;
  }
  if (summary.status === "blocked_on_compute") {
    return 4;
  }
  if (summary.status === "timeout") {
    return 5;
  }
  return 2;
}

function isDeadlocked({ summary }: { summary: ExecAutomationSummary }): boolean {
  if (summary.status !== "timeout") {
    return false;
  }
  const { state } = summary;
  return (
    state.pendingUserQuestions > 0 ||
    state.pendingBaselineConfirmations > 0 ||
    state.triageHypotheses > 0 ||
    state.computeBlockers.length > 0
  );
}

async function teardownExecLifecycle({
  lifecycle,
}: {
  lifecycle: ExecLifecycleHandle | undefined;
}): Promise<void> {
  if (lifecycle) {
    await lifecycle.teardown();
  }
}

function parseExecOptions({ argv }: { argv: string[] }): ExecCommandOptions {
  const options = parseAutomationOptions({ argv });
  const timeout = commandLineModule.optionalStringOption({
    value: options.parsed.options.timeout,
    flag: "--timeout",
  });
  return {
    ...options.command,
    timeoutSeconds: timeout
      ? commandLineModule.positiveInteger({ value: timeout, flag: "--timeout" })
      : 600,
  };
}

function parseAutomationOptions({ argv }: { argv: string[] }): {
  command: AutomationCommandOptions;
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
} {
  const parsed = commandLineModule.parseOptions({
    argv,
    commandName: "situ exec",
    options: [
      { rawName: "-o, --objective <objective>" },
      { rawName: "--host <host>" },
      { rawName: "--port <port>" },
      { rawName: "--session <session>" },
      { rawName: "--timeout <seconds>" },
      { rawName: "--compute-pool <pool>" },
      { rawName: "--compute-kind <kind>" },
      { rawName: "--compute-label <label>" },
      { rawName: "--cuda-visible-devices <devices>" },
      { rawName: "--json" },
      { rawName: "-h, --help" },
    ],
  });

  if (commandLineModule.booleanOption({ value: parsed.options.help })) {
    printAutomationHelp();
    process.exit(0);
  }
  if (parsed.positionals.length > 0) {
    throw new Error("objective must be provided with --objective");
  }
  const port = commandLineModule.optionalStringOption({
    value: parsed.options.port,
    flag: "--port",
  });

  return {
    command: {
      objective: commandLineModule.optionalStringOption({
        value: parsed.options.objective,
        flag: "--objective",
      }),
      sessionId: commandLineModule.optionalStringOption({
        value: parsed.options.session,
        flag: "--session",
      }),
      server: {
        host:
          commandLineModule.optionalStringOption({
            value: parsed.options.host,
            flag: "--host",
          }) ?? defaultRuntimeHost,
        port: port
          ? commandLineModule.portNumber({ value: port, flag: "--port" })
          : defaultRuntimePort,
        allowPortFallback: !port,
      },
      json: commandLineModule.booleanOption({ value: parsed.options.json }),
      compute: execComputeOptions({ parsed }),
    },
    parsed,
  };
}

function execComputeOptions({
  parsed,
}: {
  parsed: ReturnType<typeof commandLineModule.parseOptions>;
}): ExecComputeOptions | undefined {
  const pool = commandLineModule.optionalStringOption({
    value: parsed.options.computePool,
    flag: "--compute-pool",
  });
  const kind = commandLineModule.optionalStringOption({
    value: parsed.options.computeKind,
    flag: "--compute-kind",
  });
  const label = commandLineModule.optionalStringOption({
    value: parsed.options.computeLabel,
    flag: "--compute-label",
  });
  const cudaVisibleDevices = commandLineModule.optionalStringOption({
    value: parsed.options.cudaVisibleDevices,
    flag: "--cuda-visible-devices",
  });
  if (!pool && !kind && !label && !cudaVisibleDevices) {
    return undefined;
  }
  return {
    pool: pool ?? "local",
    kind: kind ?? "local",
    label,
    cudaVisibleDevices,
  };
}

function formatStateBody({ state }: { state: AutomationProgress["state"] }): string {
  const missingPools = distinctComputePools({
    state,
    kind: "missing_pool",
  });
  const busyPools = distinctComputePools({
    state,
    kind: "busy_pool",
  });
  return [
    `activeResearchTasks=${state.activeResearchTasks}`,
    `pendingWorkItems=${state.pendingWorkItems}`,
    `claimedWorkItems=${state.claimedWorkItems}`,
    `runningClaudeAgentRuns=${state.runningClaudeAgentRuns}`,
    `triageHypotheses=${state.triageHypotheses}`,
    `pendingUserQuestions=${state.pendingUserQuestions}`,
    `pendingBaselineConfirmations=${state.pendingBaselineConfirmations}`,
    `computeBlocked=${state.computeBlockers.length}`,
    `missingComputePools=${missingPools.length ? missingPools.join(",") : "none"}`,
    `busyComputePools=${busyPools.length ? busyPools.join(",") : "none"}`,
    `failed=${state.failedResearchTasks + state.failedWorkItems + state.failedClaudeAgentRuns}`,
  ].join(" ");
}

function formatProgressLine({ state }: AutomationProgress): string {
  return `[situ-exec] ${formatStateBody({ state })}`;
}

function formatFinalSummaryLine({ summary }: { summary: ExecAutomationSummary }): string {
  const deadlock = isDeadlocked({ summary }) ? "yes" : "no";
  return `[situ-exec] Final: status=${summary.status} ${formatStateBody({ state: summary.state })} deadlock=${deadlock}`;
}

function createPrintProgress(): (progress: AutomationProgress) => void {
  let lastLine = "";
  return (progress) => {
    const line = formatProgressLine(progress);
    if (line === lastLine) {
      return;
    }
    lastLine = line;
    console.error(line);
  };
}

function execResultText({
  runtime,
  summary,
}: {
  runtime: SessionRuntimeContext;
  summary: ExecAutomationSummary;
}): string {
  return `${formatFinalSummaryLine({ summary })}\n${execStatusLine({ runtime, summary })}`;
}

function execStatusLine({
  runtime,
  summary,
}: {
  runtime: SessionRuntimeContext;
  summary: ExecAutomationSummary;
}): string {
  const base = `[situ-exec] Exec ${summary.status} for session ${runtime.sessionId}`;
  if (summary.status === "blocked_on_compute") {
    const blocker = summary.computeBlockers?.[0];
    if (!blocker) {
      return base;
    }
    const remaining =
      summary.computeBlockers && summary.computeBlockers.length > 1
        ? ` (+${summary.computeBlockers.length - 1} more)`
        : "";
    return `${base}: ${blocker.message}${remaining}`;
  }
  if (summary.status !== "blocked_on_user") {
    if (summary.status === "timeout" && summary.state.computeBlockers.length > 0) {
      const blocker = summary.state.computeBlockers[0];
      const remaining =
        summary.state.computeBlockers.length > 1
          ? ` (+${summary.state.computeBlockers.length - 1} more)`
          : "";
      return `${base}: ${blocker.message}${remaining}`;
    }
    return base;
  }
  const blocker = summary.blockers?.[0];
  if (!blocker) {
    return base;
  }
  const remaining =
    summary.blockers && summary.blockers.length > 1
      ? ` (+${summary.blockers.length - 1} more)`
      : "";
  return `${base}: ${blocker.kind} ${blocker.interactionId} waiting for input${remaining}`;
}

function distinctComputePools({
  state,
  kind,
}: {
  state: AutomationProgress["state"];
  kind: AutomationProgress["state"]["computeBlockers"][number]["kind"];
}): string[] {
  return Array.from(
    new Set(
      state.computeBlockers
        .filter((blocker) => blocker.kind === kind)
        .map((blocker) => blocker.pool),
    ),
  ).sort();
}

function printAutomationHelp(): void {
  console.log(`Usage:
  situ exec --objective "objective" [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--session id] [--compute-pool local] [--compute-kind local] [--compute-label label] [--cuda-visible-devices value] [--json]
  situ exec --session <session-id> [--objective "objective"] [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--json]`);
}
