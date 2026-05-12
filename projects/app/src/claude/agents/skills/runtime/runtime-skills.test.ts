import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, test } from "bun:test";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function normalizeMarkerText(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

async function readSkill(skillName: string): Promise<string> {
  return readFile(join(moduleDir, skillName, "SKILL.md"), "utf8");
}

function expectRequiredMarkers(output: string, markers: readonly string[]): void {
  const normalized = normalizeMarkerText(output);
  const missing = markers.filter((marker) => !normalized.includes(normalizeMarkerText(marker)));
  if (missing.length > 0) {
    throw new Error(
      `Missing required markers:\n${missing.map((m) => `  - ${JSON.stringify(m)}`).join("\n")}`,
    );
  }
}

function expectForbiddenMarkers(output: string, markers: readonly string[]): void {
  const normalized = normalizeMarkerText(output);
  const found = markers.filter((marker) => normalized.includes(normalizeMarkerText(marker)));
  if (found.length > 0) {
    throw new Error(
      `Forbidden markers were present:\n${found.map((m) => `  - ${JSON.stringify(m)}`).join("\n")}`,
    );
  }
}

const commonForbidden = ["Critic", "ResearchMove", "AgentObjective"];

describe("runtime managed-agent skills", () => {
  test("situ-manager-runtime emits the Manager procedure and quality markers", async () => {
    const source = await readSkill("situ-manager-runtime");
    expectRequiredMarkers(source, [
      "name: situ-manager-runtime",
      "ResearchProject",
      "ResearchTask",
      "workerPrompt",
      "verificationPrompt",
      "create_research_task",
      "project is in search phase",
      "per-turn ResearchTask budget",
      "get_planning_advice",
      "diversity signal",
      "stranded triage hypotheses",
      "advisory, not binding",
      "`exhausted`",
      "different axis",
      "relevanceToExhausted",
      "one ResearchTask per independent candidate direction",
      "do not bundle multiple exploit variants",
      "deepens a verified experiment",
      "create_experiment.parentExperimentId",
      "search_research_tasks",
      "create_hypothesis",
      "at most one new hypothesis per turn",
      'targetKind: "hypothesis"',
      "Record Writing Style",
      "Write durable record text in a human-sounding way",
      "compact human notes",
      "Titles: natural action phrases",
      "usually 5-14 words",
      "compact checklists",
      "ResearchTask Prompt Quality",
      "brittle literal edit recipe",
      "inspect assertions",
      "batch-size or memory constants",
      "directly coupled constants",
      "preserve evaluation/data comparability",
      "fresh parseable metrics or clear crash/OOM/timeout evidence",
      "ask_user_question",
      "create_project_baseline",
      "Manager-owned setup baseline",
      "present_baseline_for_confirmation",
      "run_readonly_workspace_command",
      "Never treat a pending confirmation as approval.",
      "Only call `complete_research_project` after baseline approval has been confirmed",
      "no pending user interaction",
      "verified ResearchTask evidence or reporting-phase final output",
      "complete_research_project",
      "fail_research_project",
      "`workerPrompt` is the Verifier assignment",
      "no Scientist worker will run",
      "verified ResearchTask results",
      "Except for the Manager-owned setup baseline",
      "verification.signals",
      "signals.suspicious_holdout_divergence",
      "redesign rather than abandoning",
      "not optimize against the held-out metric",
      "Memory curation",
      "/mnt/memory/best-threads.md",
      "/mnt/memory/learnings.md",
      "/mnt/memory/external-refs.md",
      "Only the Manager can read or write",
      "Parallelize exploration",
      "in the same turn",
      "Combiner-first exploit instinct",
      "must be a combiner",
      "combine: <axis-A>",
      "Web search for ideation only",
      "ideation and exploration",
      "never as evidence",
    ]);
    expectForbiddenMarkers(source, ["AgentObjective", "agentObjective", "ResearchMove", "Critic"]);
  });

  test("situ-scientist-runtime emits the Scientist procedure and skill-boundary markers", async () => {
    const source = await readSkill("situ-scientist-runtime");
    expectRequiredMarkers(source, [
      "name: situ-scientist-runtime",
      "ResearchTask",
      "workerPrompt",
      "get_research_task",
      "situ-scientist-explore-task",
      "situ-scientist-exploit-task",
      "situ-scientist-debug-task",
      "situ-scientist-synthesize-task",
      "situ-scientist-prune-task",
      "verify ResearchTasks are Verifier-owned",
      "run_readonly_workspace_command",
      "run_workspace_command",
      "isolated explore baseline work",
      "Explore tasks may create a Hypothesis",
      "one primary Hypothesis",
      "parentExperimentId",
      "parent candidate commit",
      "Record Writing Style",
      "Use natural 5-14 word titles",
      "compact human summary notes",
      "Summaries can be 1-2 sentences",
      "brief evidence bullets",
      "exact recipe",
      "directly coupled assertions",
      "compatibility fixes",
      "SITU_COMMAND_OUTPUT_DIR",
      "Do not create `run.log`, `results.tsv`, or other command-output files",
      "Long-Running Commands",
      "Start the real command in the background",
      "write a pid or status file",
      "Poll with short follow-up",
      "Do not submit the ResearchTask until the background process has exited",
      "produces no parseable metrics",
      "do not record it as a metric-based success or discard",
      "Use the task objective's failure label",
      "fail_research_task",
      "submit_research_task_for_verification",
      "Do not mark final success yourself; final success requires a Verifier pass.",
      "Web search for ideation only",
      "ideation and exploration",
      "never as evidence",
    ]);
    expectForbiddenMarkers(source, commonForbidden);
  });

  test("situ-scientist-explore-task emits the explore-task procedure", async () => {
    const source = await readSkill("situ-scientist-explore-task");
    expectRequiredMarkers(source, [
      "name: situ-scientist-explore-task",
      "ResearchTask type is `explore`",
      "run_readonly_workspace_command",
      "run_workspace_command",
      "isolated baseline worktrees",
      "create_hypothesis",
      "create_baseline",
      "create_experiment",
      "create_evaluation",
      "record_measurement",
      "write it as a Hypothesis",
      "Keep titles natural and summaries compact",
      "SITU_COMMAND_OUTPUT_DIR",
      "do not write `run.log`, `results.tsv`, or similar",
      "long-running command pattern",
      "launch it in the background",
      "poll with short follow-up command calls",
      "require fresh parseable output",
      "do not reuse stale metrics",
      "do not call `capture_experiment_candidate`",
      "submit_research_task_for_verification",
    ]);
    expectForbiddenMarkers(source, commonForbidden);
  });

  test("situ-scientist-exploit-task emits the exploit-task procedure", async () => {
    const source = await readSkill("situ-scientist-exploit-task");
    expectRequiredMarkers(source, [
      "name: situ-scientist-exploit-task",
      "ResearchTask type is `exploit`",
      "create_experiment",
      "primary hypothesis",
      "associatedHypothesisId",
      "parentExperimentId",
      "Do not copy or retype parent changes manually",
      "parent candidate commit",
      "multiple independent exploit variants",
      "one ResearchTask per candidate direction",
      "A combiner exploit task",
      "Do not split a combiner",
      "starts from the lab baseline",
      "Use a natural title and compact summary note",
      "run_workspace_command",
      "prepared automatically",
      "SITU_EXPERIMENT_OUTPUT_DIR",
      "do not create `run.log`, `results.tsv`, or similar",
      "long-running command pattern",
      "launch it in the background",
      "poll with short follow-up command calls",
      "Require fresh parseable metrics",
      "invalid measurement",
      "Do not call invalid measurement a normal discard",
      "capture_experiment_candidate",
      "record_experiment_comparison",
      "submit_research_task_for_verification",
      "metrics: { dev: { ... }, holdout: { ... } }",
      "trust check",
    ]);
    expectForbiddenMarkers(source, commonForbidden);
  });

  test("situ-scientist-debug-task emits the debug-task procedure", async () => {
    const source = await readSkill("situ-scientist-debug-task");
    expectRequiredMarkers(source, [
      "name: situ-scientist-debug-task",
      "ResearchTask type is `debug`",
      "failed or blocked branch",
      "preserve the primary hypothesis",
      "run_workspace_command",
      "SITU_EXPERIMENT_OUTPUT_DIR",
      "do not create `run.log`, `results.tsv`, or similar",
      "long-running command pattern",
      "launch it in the background",
      "poll with short follow-up command calls",
      "Preserve crash or invalid-measurement evidence",
      "fresh rerun succeeds",
      "1-3 short evidence sentences or bullets",
      "Do not use a debug task to start an unrelated candidate",
      "submit_research_task_for_verification",
    ]);
    expectForbiddenMarkers(source, commonForbidden);
  });

  test("situ-scientist-synthesize-task emits the synthesize-task procedure", async () => {
    const source = await readSkill("situ-scientist-synthesize-task");
    expectRequiredMarkers(source, [
      "name: situ-scientist-synthesize-task",
      "ResearchTask type is `synthesize`",
      "create_artifact",
      "artifact `body`",
      "short sections",
      "plain next-step language",
      "inline report artifacts",
      "inline reports do not need a real file path",
      "Distinguish verified findings from open questions",
      "create_entity_link",
      "use `researchTaskId` only for explicit ResearchTask ownership",
      "Do not call `run_readonly_workspace_command`",
      "run_workspace_command",
      "Do not mutate repository files",
      "submit_research_task_for_verification",
    ]);
    expectForbiddenMarkers(source, commonForbidden);
  });

  test("situ-scientist-prune-task emits the prune-task procedure", async () => {
    const source = await readSkill("situ-scientist-prune-task");
    expectRequiredMarkers(source, [
      "name: situ-scientist-prune-task",
      "ResearchTask type is `prune`",
      "branch should stop",
      "artifact `body`",
      "short bullets",
      "inline rationale artifacts",
      "inline rationales do not need a real file path",
      "Do not call `run_readonly_workspace_command`",
      "run_workspace_command",
      "Do not create new candidate experiments",
      "submit_research_task_for_verification",
    ]);
    expectForbiddenMarkers(source, commonForbidden);
  });

  test("situ-reporter-runtime emits the Reporter output contract", async () => {
    const source = await readSkill("situ-reporter-runtime");
    expectRequiredMarkers(source, [
      "name: situ-reporter-runtime",
      "Output Contract",
      "REPORT.md",
      "README.md",
      "DETAILS.md",
      "trajectory.png",
      "patches/<slug>/",
      "run_report_command",
      "list_feed_entries",
      "Defensibly real?",
      "Web search for ideation only",
      "ideation and exploration",
      "never as evidence",
      "do not let outside reading override",
    ]);
    expectForbiddenMarkers(source, [...commonForbidden, "_make_trajectory.py"]);
  });

  test("situ-verifier-runtime emits the Verifier procedure and verdict markers", async () => {
    const source = await readSkill("situ-verifier-runtime");
    expectRequiredMarkers(source, [
      "name: situ-verifier-runtime",
      "ResearchTask",
      "workerPrompt",
      "verificationPrompt",
      "get_research_task",
      "search_hypotheses",
      "search_research_tasks",
      "situ-verifier-verify-task",
      "run_readonly_workspace_command",
      "record_research_task_verification",
      "Record Writing Style",
      "one clear judgment sentence",
      "short evidence summary",
      "missing primary hypothesis",
      "missing or wrong `parentExperimentId` on deepening experiments",
      "status `passed`, `failed`, `suspicious`, or `needs_more_evidence`",
      "`passed` only with a non-empty evidence summary",
      "`needs_more_evidence` reopens it as planned work",
    ]);
    expectForbiddenMarkers(source, [
      ...commonForbidden,
      "accept_hypothesis",
      "submit_hypothesis",
      "complete_hypothesis",
      "cancel_hypothesis",
      "fail_hypothesis",
      "add_hypothesis_comment",
      "run_workspace_command",
      "web_search",
    ]);
  });

  test("situ-verifier-verify-task emits the verify-task procedure and signals", async () => {
    const source = await readSkill("situ-verifier-verify-task");
    expectRequiredMarkers(source, [
      "name: situ-verifier-verify-task",
      "ResearchTask type is `verify`",
      "Verify ResearchTasks are Verifier-owned",
      "workerPrompt as the verification assignment",
      "missing primary hypothesis",
      "Use full durable record ids",
      "run_readonly_workspace_command",
      "record_research_task_verification",
      "short, human, and evidence-backed",
      "Do not create science records",
      "ResearchTaskVerification",
      "`needs_more_evidence` reopens the task as planned work",
      "Held-out cross-check",
      "suspicious_holdout_divergence",
      "change the verdict",
      "do not flag",
    ]);
    expectForbiddenMarkers(source, [
      ...commonForbidden,
      "accept_hypothesis",
      "submit_hypothesis",
      "complete_hypothesis",
      "cancel_hypothesis",
      "fail_hypothesis",
      "add_hypothesis_comment",
      "run_workspace_command",
      "web_search",
    ]);
  });
});
