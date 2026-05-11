import type { TinyAutoresearchSeedName } from "@situ/evals-fixtures/tiny-autoresearch";
import {
  createTinyAutoresearchWorld,
  readTinyAutoresearchDurableState,
  runTinyAutoresearchLiveExec,
  type TinyAutoresearchLiveExecConfig,
} from "@situ/evals-worlds/tiny-autoresearch";

import { jsonModule } from "../../modules/json";

const [command, commandValue] = Bun.argv.slice(2);

try {
  if (command === "state") {
    const { world, cleanup } = await createTinyAutoresearchWorld({
      seedName: seedName({ value: commandValue }),
    });
    try {
      console.log(
        jsonModule.stringify({ value: { state: readTinyAutoresearchDurableState({ world }) } }),
      );
    } finally {
      await cleanup();
    }
  } else if (command === "live") {
    const liveConfig = liveExecConfig({ value: commandValue });
    const { world, cleanup } = await createTinyAutoresearchWorld({
      seedName: liveConfig.seedName,
      keep: liveConfig.isWatchEnabled || liveConfig.isKeepWorldEnabled,
    });
    printWatchEvent({
      isWatchEnabled: liveConfig.isWatchEnabled,
      type: "world.ready",
      rootPath: world.rootPath,
      workspacePath: world.workspacePath,
      situHome: world.situHome,
      dbPath: world.dbPath,
      sessionId: world.sessionId,
    });
    try {
      const result = await runTinyAutoresearchLiveExec({
        world,
        config: {
          ...liveConfig.exec,
          seedName: liveConfig.seedName,
          timeoutSeconds: liveConfig.timeoutSeconds,
          isWatchEnabled: liveConfig.isWatchEnabled,
        },
      });
      console.log(jsonModule.stringify({ value: result }));
    } finally {
      printWatchEvent({
        isWatchEnabled: liveConfig.isWatchEnabled,
        type: "world.cleanup",
        rootPath: world.rootPath,
        kept: world.keep,
      });
      await cleanup();
    }
  } else {
    throw new Error(`Unknown tiny autoresearch world command: ${String(command)}`);
  }
  process.exit(0);
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack ?? "");
  } else {
    console.error(String(error));
  }
  process.exit(1);
}

function printWatchEvent({
  isWatchEnabled,
  ...payload
}: Record<string, unknown> & { isWatchEnabled: boolean }): void {
  if (!isWatchEnabled) {
    return;
  }
  console.error(`LIVE_AGENT_EVAL ${jsonModule.stringify({ value: payload })}`);
}

function seedName({ value }: { value: string | undefined }): TinyAutoresearchSeedName {
  const seed = value as TinyAutoresearchSeedName | undefined;
  if (
    seed === "empty_repo" ||
    seed === "needs_baseline" ||
    seed === "with_baseline_result" ||
    seed === "with_candidate_result" ||
    seed === "comparability_break" ||
    seed === "large_search_ridge"
  ) {
    return seed;
  }
  throw new Error(`Invalid tiny autoresearch seed: ${String(value)}`);
}

function positiveInteger({
  value,
  fallback,
}: {
  value: string | undefined;
  fallback: number;
}): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected positive integer, got: ${value}`);
  }
  return parsed;
}

function liveExecConfig({ value }: { value: string | undefined }): {
  caseName: string;
  seedName: TinyAutoresearchSeedName;
  exec: Omit<TinyAutoresearchLiveExecConfig, "seedName" | "timeoutSeconds" | "isWatchEnabled">;
  timeoutSeconds: number;
  isWatchEnabled: boolean;
  isKeepWorldEnabled: boolean;
} {
  if (!value) {
    return {
      caseName: "baseline_scientist_verifier",
      seedName: "empty_repo",
      exec: {
        driver: "scientist_verifier",
      },
      timeoutSeconds: 180,
      isWatchEnabled: false,
      isKeepWorldEnabled: false,
    };
  }
  const parsed = jsonModule.parse<{
    caseName?: unknown;
    seedName?: unknown;
    exec?: unknown;
    timeoutSeconds?: unknown;
    isWatchEnabled?: unknown;
    isKeepWorldEnabled?: unknown;
  }>({ text: value });
  return {
    caseName:
      typeof parsed.caseName === "string" && parsed.caseName.trim()
        ? parsed.caseName.trim()
        : "baseline_scientist_verifier",
    seedName: seedName({
      value: typeof parsed.seedName === "string" ? parsed.seedName : undefined,
    }),
    exec: liveExecCaseConfig({ value: parsed.exec }),
    timeoutSeconds: positiveInteger({
      value:
        typeof parsed.timeoutSeconds === "number" || typeof parsed.timeoutSeconds === "string"
          ? String(parsed.timeoutSeconds)
          : undefined,
      fallback: 180,
    }),
    isWatchEnabled: parsed.isWatchEnabled === true,
    isKeepWorldEnabled: parsed.isKeepWorldEnabled === true,
  };
}

function liveExecCaseConfig({
  value,
}: {
  value: unknown;
}): Omit<TinyAutoresearchLiveExecConfig, "seedName" | "timeoutSeconds" | "isWatchEnabled"> {
  if (!isObjectRecord(value)) {
    throw new Error("Live eval exec config is required.");
  }
  const driver = value.driver;
  if (driver !== "manager_turn" && driver !== "scientist_verifier" && driver !== "verifier_turn") {
    throw new Error(`Invalid live eval driver: ${String(driver)}`);
  }
  return {
    driver,
    goal: optionalString({ record: value, key: "goal" }),
    projectPhase: projectPhaseValue({ record: value }),
    baselineSummary: optionalString({ record: value, key: "baselineSummary" }),
    title: optionalString({ record: value, key: "title" }),
    type: researchTaskTypeValue({ record: value }),
    priority: researchTaskPriorityValue({ record: value }),
    workerPrompt: optionalString({ record: value, key: "workerPrompt" }),
    verificationPrompt: optionalString({ record: value, key: "verificationPrompt" }),
    workerSummary: optionalString({ record: value, key: "workerSummary" }),
    seedResearchTasks: seedResearchTasksValue({ record: value }),
  };
}

function seedResearchTasksValue({
  record,
}: {
  record: Record<string, unknown>;
}): TinyAutoresearchLiveExecConfig["seedResearchTasks"] {
  const value = record.seedResearchTasks;
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("seedResearchTasks must be an array.");
  }
  return value.map((entry) => seedResearchTaskValue({ value: entry }));
}

function seedResearchTaskValue({
  value,
}: {
  value: unknown;
}): NonNullable<TinyAutoresearchLiveExecConfig["seedResearchTasks"]>[number] {
  if (!isObjectRecord(value)) {
    throw new Error("seedResearchTasks entries must be objects.");
  }
  return {
    title: requiredString({ record: value, key: "title" }),
    type: requiredResearchTaskType({ record: value }),
    priority: researchTaskPriorityValue({ record: value }),
    workerPrompt: requiredString({ record: value, key: "workerPrompt" }),
    verificationPrompt: requiredString({ record: value, key: "verificationPrompt" }),
    status: researchTaskStatusValue({ record: value }),
    resultSummary: optionalString({ record: value, key: "resultSummary" }),
    verification: seedVerificationValue({ record: value }),
  };
}

function seedVerificationValue({
  record,
}: {
  record: Record<string, unknown>;
}):
  | NonNullable<
      NonNullable<TinyAutoresearchLiveExecConfig["seedResearchTasks"]>[number]["verification"]
    >
  | undefined {
  const value = record.verification;
  if (value === undefined) {
    return undefined;
  }
  if (!isObjectRecord(value)) {
    throw new Error("seed verification must be an object.");
  }
  const status = value.status;
  if (
    status !== "passed" &&
    status !== "failed" &&
    status !== "suspicious" &&
    status !== "needs_more_evidence"
  ) {
    throw new Error(`Invalid seed verification status: ${String(status)}`);
  }
  const profile = value.profile;
  return {
    status,
    profile:
      profile === undefined
        ? undefined
        : profile === "hypothesis" ||
            profile === "experiment" ||
            profile === "measurement" ||
            profile === "adversarial" ||
            profile === "report" ||
            profile === "general"
          ? profile
          : invalidEnum({ label: "seed verification profile", value: profile }),
    judgment: requiredString({ record: value, key: "judgment" }),
    evidenceSummary: requiredString({ record: value, key: "evidenceSummary" }),
  };
}

function projectPhaseValue({
  record,
}: {
  record: Record<string, unknown>;
}): TinyAutoresearchLiveExecConfig["projectPhase"] {
  const value = record.projectPhase;
  if (value === undefined) {
    return undefined;
  }
  if (
    value === "onboarding" ||
    value === "search" ||
    value === "reporting" ||
    value === "complete"
  ) {
    return value;
  }
  throw new Error(`Invalid projectPhase: ${String(value)}`);
}

function researchTaskTypeValue({
  record,
}: {
  record: Record<string, unknown>;
}): TinyAutoresearchLiveExecConfig["type"] {
  const value = record.type;
  if (value === undefined) {
    return undefined;
  }
  return researchTaskType({ value });
}

function requiredResearchTaskType({
  record,
}: {
  record: Record<string, unknown>;
}): NonNullable<TinyAutoresearchLiveExecConfig["type"]> {
  return researchTaskType({ value: record.type });
}

function researchTaskType({
  value,
}: {
  value: unknown;
}): NonNullable<TinyAutoresearchLiveExecConfig["type"]> {
  if (
    value === "explore" ||
    value === "exploit" ||
    value === "debug" ||
    value === "verify" ||
    value === "synthesize" ||
    value === "prune"
  ) {
    return value;
  }
  throw new Error(`Invalid researchTask type: ${String(value)}`);
}

function researchTaskPriorityValue({
  record,
}: {
  record: Record<string, unknown>;
}): TinyAutoresearchLiveExecConfig["priority"] {
  const value = record.priority;
  if (value === undefined) {
    return undefined;
  }
  if (value === "urgent" || value === "high" || value === "normal" || value === "low") {
    return value;
  }
  throw new Error(`Invalid researchTask priority: ${String(value)}`);
}

function researchTaskStatusValue({
  record,
}: {
  record: Record<string, unknown>;
}): NonNullable<TinyAutoresearchLiveExecConfig["seedResearchTasks"]>[number]["status"] {
  const value = record.status;
  if (value === undefined) {
    return undefined;
  }
  if (
    value === "planned" ||
    value === "running" ||
    value === "awaiting_verification" ||
    value === "verified" ||
    value === "rejected" ||
    value === "pruned" ||
    value === "failed" ||
    value === "canceled"
  ) {
    return value;
  }
  throw new Error(`Invalid researchTask status: ${String(value)}`);
}

function optionalString({
  record,
  key,
}: {
  record: Record<string, unknown>;
  key: string;
}): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredString({ record, key }: { record: Record<string, unknown>; key: string }): string {
  const value = optionalString({ record, key });
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidEnum({ label, value }: { label: string; value: unknown }): never {
  throw new Error(`Invalid ${label}: ${String(value)}`);
}
