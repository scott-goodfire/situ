import {
  tinyAutoresearchScenario,
  type TinyAutoresearchSeedName,
} from "@situ/evals-fixtures/tiny-autoresearch";

import { jsonModule } from "../modules/json";
import { requireSuccessfulCommand, runCommand, type CommandResult } from "./command";
import { tinyAutoresearchWorldEnv, type TinyAutoresearchWorld } from "./create-world";
import {
  readTinyAutoresearchDurableState,
  type TinyAutoresearchDurableState,
} from "./durable-state";

export type RunTinyAutoresearchLiveExecResult = Readonly<{
  command: CommandResult;
  state: TinyAutoresearchDurableState;
}>;

export type TinyAutoresearchLiveExecDriver =
  | "manager_turn"
  | "scientist_verifier"
  | "verifier_turn";

export type TinyAutoresearchLiveExecSeedVerification = Readonly<{
  status: "passed" | "failed" | "suspicious" | "needs_more_evidence";
  profile?: "hypothesis" | "experiment" | "measurement" | "adversarial" | "report" | "general";
  judgment: string;
  evidenceSummary: string;
  signals?: Readonly<Record<string, unknown>>;
}>;

export type TinyAutoresearchLiveExecSeedResearchTask = Readonly<{
  title: string;
  type: "explore" | "exploit" | "debug" | "verify" | "synthesize" | "prune";
  priority?: "urgent" | "high" | "normal" | "low";
  targetKind?: string;
  targetId?: string;
  workerPrompt: string;
  verificationPrompt: string;
  status?:
    | "planned"
    | "running"
    | "awaiting_verification"
    | "verified"
    | "rejected"
    | "pruned"
    | "failed"
    | "canceled";
  resultSummary?: string;
  verification?: TinyAutoresearchLiveExecSeedVerification;
}>;

export type TinyAutoresearchLiveExecConfig = Readonly<{
  seedName: TinyAutoresearchSeedName;
  driver: TinyAutoresearchLiveExecDriver;
  timeoutSeconds: number;
  isWatchEnabled?: boolean;
  goal?: string;
  projectPhase?: "onboarding" | "baseline" | "search" | "reporting" | "complete";
  baselineSummary?: string;
  title?: string;
  type?: "explore" | "exploit" | "debug" | "verify" | "synthesize" | "prune";
  priority?: "urgent" | "high" | "normal" | "low";
  targetKind?: string;
  targetId?: string;
  workerPrompt?: string;
  verificationPrompt?: string;
  workerSummary?: string;
  seedResearchTasks?: TinyAutoresearchLiveExecSeedResearchTask[];
}>;

export async function runTinyAutoresearchLiveExec({
  world,
  config,
}: {
  world: TinyAutoresearchWorld;
  config: TinyAutoresearchLiveExecConfig;
}): Promise<RunTinyAutoresearchLiveExecResult> {
  const key = process.env.SITU_ANTHROPIC_KEY?.trim();
  if (!key) {
    throw new Error(
      "SITU_ANTHROPIC_KEY is required for live agent evals. Run: SITU_ANTHROPIC_KEY=sk-ant-... mise run evals",
    );
  }

  const command = await runCommand({
    cmd: [
      "bun",
      "run",
      "src/runtime/automation/live-agent-slice-eval.ts",
      jsonModule.stringify({
        value: {
          driver: config.driver,
          goal: config.goal ?? defaultLiveGoal(),
          projectPhase: config.projectPhase,
          baselineSummary: config.baselineSummary,
          title: config.title ?? "Establish the native tiny autoresearch baseline",
          type: config.type,
          priority: config.priority,
          targetKind: config.targetKind,
          targetId: config.targetId,
          workerPrompt: config.workerPrompt ?? defaultWorkerPrompt(),
          verificationPrompt: config.verificationPrompt ?? defaultVerificationPrompt(),
          workerSummary: config.workerSummary,
          seedResearchTasks: config.seedResearchTasks,
          timeoutSeconds: config.timeoutSeconds,
        },
      }),
    ],
    cwd: world.appRoot,
    env: tinyAutoresearchWorldEnv({
      world,
      env: { SITU_ANTHROPIC_KEY: key },
    }),
    timeoutMs: (config.timeoutSeconds + 30) * 1000,
    streamStderr: config.isWatchEnabled === true,
  });
  requireSuccessfulCommand({ result: command });
  return {
    command,
    state: readTinyAutoresearchDurableState({ world }),
  };
}

function defaultLiveGoal(): string {
  const scenario = tinyAutoresearchScenario({ name: "discovers_repo_native_baseline" });
  return scenario.prompt;
}

function defaultWorkerPrompt(): string {
  return [
    "You are working inside a ResearchTask for the tiny autoresearch fixture.",
    "Keep the run narrow: inspect the repository, identify the repo-native baseline, then persist exactly one Baseline, one Evaluation linked to that baseline, and one Measurement containing the validation metric key val_bpb.",
    "Do not edit repository source files for this eval. Use durable records and submit the ResearchTask for verification when the baseline is recorded.",
    "When summarizing evidence, include full durable record ids exactly as returned by tools. Do not abbreviate UUIDs.",
  ].join("\n\n");
}

function defaultVerificationPrompt(): string {
  return [
    "Verify that the ResearchTask established the tiny autoresearch baseline without cheating.",
    "Pass only if there is exactly one relevant baseline, an evaluation linked to it, and a measurement that records val_bpb from the fixture's intended validation output.",
    "Fail or mark suspicious if source files such as prepare.py were changed, if the metric was invented, or if the durable records do not support the claimed baseline.",
    "Use full durable record ids exactly as returned by tools. If the worker summary abbreviates an id, list or search records instead of calling get_* with the abbreviated id.",
  ].join("\n\n");
}
