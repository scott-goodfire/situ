import { ensureRuntimeContext } from "../config/session-context";
import type { SessionRuntimeContext } from "../config/session-context";
import { defaultRuntimeHost, defaultRuntimePort } from "../config/runtime";
import { commandLineModule } from "../modules/command-line";
import { printResult } from "./__shared__";
import { seedSessionObjective, runAutomationUntilIdle } from "../runtime/automation";
import type { AutomationProgress } from "../runtime/automation";
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
  resume: boolean;
  sessionId?: string;
  server: ExecServerOptions;
  json: boolean;
};

type ExecCommandOptions = AutomationCommandOptions & {
  timeoutSeconds: number;
};

type ExecResearchProject = Awaited<ReturnType<typeof seedSessionObjective>>["researchProject"];
type ExecAutomationSummary = Awaited<ReturnType<typeof runAutomationUntilIdle>>;

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
  printExecStart({ runtime, lifecycle });
  try {
    const researchProject = await seedObjectiveForExec({ options });
    const summary = await runExecAutomation({ options });
    printExecResult({ options, runtime, lifecycle, researchProject, summary });
    return exitCodeFromExecSummary({ summary });
  } finally {
    await teardownExecLifecycle({ lifecycle });
  }
}

async function assertExecCanRun({ options }: { options: ExecCommandOptions }): Promise<void> {
  if (!options.objective && !options.resume && !options.sessionId) {
    throw new Error("objective is required unless --resume or --session is provided");
  }
  if (!(await hasAnthropicKey())) {
    throw new Error("SITU_ANTHROPIC_KEY is required for headless exec.");
  }
}

function runtimeContextOptions({ options }: { options: ExecCommandOptions }): {
  resume: boolean;
  sessionId?: string;
} {
  return {
    resume: options.resume,
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
  });
  return result.researchProject;
}

function runExecAutomation({
  options,
}: {
  options: ExecCommandOptions;
}): Promise<ExecAutomationSummary> {
  return runAutomationUntilIdle({
    timeoutSeconds: options.timeoutSeconds,
    onProgress: options.json ? undefined : printProgress,
    autoConfirmBaselines: true,
  });
}

function printExecResult({
  options,
  runtime,
  lifecycle,
  researchProject,
  summary,
}: {
  options: ExecCommandOptions;
  runtime: SessionRuntimeContext;
  lifecycle: ExecLifecycleHandle | undefined;
  researchProject: ExecResearchProject | undefined;
  summary: ExecAutomationSummary;
}): void {
  printResult({
    json: options.json,
    value: {
      sessionId: runtime.sessionId,
      webUrl: lifecycle?.webUrl ?? null,
      researchProject,
      summary,
    },
    text: execResultText({ runtime, summary }),
  });
}

function printExecStart({
  runtime,
  lifecycle,
}: {
  runtime: SessionRuntimeContext;
  lifecycle: ExecLifecycleHandle | undefined;
}): void {
  console.error("[situ-exec] Running headless automation");
  if (lifecycle?.webUrl) {
    console.error(`[situ-exec] Web UI: ${lifecycle.webUrl}`);
  }
  console.error(`[situ-exec] Session: ${runtime.sessionId}`);
}

function exitCodeFromExecSummary({ summary }: { summary: ExecAutomationSummary }): number {
  if (summary.status === "idle") {
    return 0;
  }
  if (summary.status === "blocked_on_user") {
    return 3;
  }
  return 2;
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
      { rawName: "--resume" },
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
      resume: commandLineModule.booleanOption({ value: parsed.options.resume }),
      json: commandLineModule.booleanOption({ value: parsed.options.json }),
    },
    parsed,
  };
}

function printProgress({ state }: AutomationProgress): void {
  console.error(
    [
      "[situ-exec]",
      `activeResearchTasks=${state.activeResearchTasks}`,
      `pendingWorkItems=${state.pendingWorkItems}`,
      `claimedWorkItems=${state.claimedWorkItems}`,
      `runningClaudeAgentRuns=${state.runningClaudeAgentRuns}`,
      `triageHypotheses=${state.triageHypotheses}`,
      `pendingUserQuestions=${state.pendingUserQuestions}`,
      `pendingBaselineConfirmations=${state.pendingBaselineConfirmations}`,
      `failed=${state.failedResearchTasks + state.failedWorkItems + state.failedClaudeAgentRuns}`,
    ].join(" "),
  );
}

function execResultText({
  runtime,
  summary,
}: {
  runtime: SessionRuntimeContext;
  summary: ExecAutomationSummary;
}): string {
  const base = `[situ-exec] Exec ${summary.status} for session ${runtime.sessionId}`;
  if (summary.status !== "blocked_on_user") {
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

function printAutomationHelp(): void {
  console.log(`Usage:
  situ exec --objective "objective" [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--resume] [--session id] [--json]
  situ exec --resume [--objective "objective"] [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--json]
  situ resume <session-id> [--objective "objective"] [--timeout 600] [--host ${defaultRuntimeHost}] [--port ${defaultRuntimePort}] [--json]`);
}
