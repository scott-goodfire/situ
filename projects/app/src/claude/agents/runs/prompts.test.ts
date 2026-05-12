import { describe, expect, test } from "bun:test";

import type {
  ResearchProjectInteractionRecord,
  ResearchProjectRecord,
  ResearchTaskRecord,
} from "@situ/research-projects";
import {
  SEARCH_BALANCE_SIGNAL_WINDOW,
  VERIFIER_LINEAGE_NOISE_FLOOR_DEPTH,
  managerResearchProjectPrompt,
  scientistResearchTaskPrompt,
  searchBalanceSignalLines,
  verifierResearchTaskPrompt,
  type VerifierLineageAncestor,
} from "./prompts";

function normalizeMarkerText(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
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

describe("searchBalanceSignalLines", () => {
  test("reports an empty-state line when the project has no ResearchTasks yet", () => {
    const lines = searchBalanceSignalLines({ tasks: [] });
    expect(lines).toEqual(["- No ResearchTasks recorded yet for this project."]);
  });

  test("tallies the most recent N task types and counts tasks since the last explore", () => {
    const tasks = [
      task({ id: "t1", type: "explore", createdAt: "2026-01-01T00:00:00.000Z" }),
      task({ id: "t2", type: "exploit", createdAt: "2026-01-01T00:01:00.000Z" }),
      task({ id: "t3", type: "exploit", createdAt: "2026-01-01T00:02:00.000Z" }),
      task({ id: "t4", type: "exploit", createdAt: "2026-01-01T00:03:00.000Z" }),
      task({ id: "t5", type: "exploit", createdAt: "2026-01-01T00:04:00.000Z" }),
    ];
    const lines = searchBalanceSignalLines({ tasks });
    expect(lines[0]).toBe("- Recent task type tally (last 5, of 5 total): exploit=4, explore=1.");
    expect(lines[1]).toBe(
      "- Tasks since the last explore: 4 (greedy-exploit collapse risk rises after four or five; plan an explore before another exploit when this climbs).",
    );
  });

  test("calls out the case where no explore task has ever been recorded", () => {
    const tasks = [
      task({ id: "t1", type: "exploit", createdAt: "2026-01-01T00:00:00.000Z" }),
      task({ id: "t2", type: "exploit", createdAt: "2026-01-01T00:01:00.000Z" }),
    ];
    const lines = searchBalanceSignalLines({ tasks });
    expect(lines[1]).toBe(
      "- No explore task has ever been recorded in this project (2 non-explore tasks so far).",
    );
  });

  test("clamps the recent window to SEARCH_BALANCE_SIGNAL_WINDOW", () => {
    const tasks = Array.from({ length: SEARCH_BALANCE_SIGNAL_WINDOW + 5 }, (_unused, index) =>
      task({
        id: `t${index}`,
        type: index === 0 ? "explore" : "exploit",
        createdAt: `2026-01-01T00:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    const lines = searchBalanceSignalLines({ tasks });
    expect(lines[0]).toContain(`last ${SEARCH_BALANCE_SIGNAL_WINDOW}`);
    expect(lines[0]).toContain(`of ${tasks.length} total`);
  });
});

describe("managerResearchProjectPrompt", () => {
  const forbiddenAcrossAllCases = ["AgentObjective", "ResearchMove", "Critic", "create_analysis"];

  test("planning prompt emits Manager identity, procedure, tools, and quality markers", () => {
    const project = researchProject({
      id: "research-project-plan-1",
      phase: "onboarding",
      goal: "Inventory local release scripts and GitHub release workflow.",
    });
    const output = managerResearchProjectPrompt({
      researchProject: project,
      interactions: [],
      researchTasks: [],
      verifications: [],
      plannedTaskBudget: 3,
    });
    expectRequiredMarkers(output, [
      "You are situ Manager. Drive one ResearchProject",
      "ResearchProject id: research-project-plan-1",
      "ResearchTask",
      "workerPrompt",
      "verificationPrompt",
      "Record writing style:",
      "Write record text in a human-sounding way",
      "Titles should be natural action phrases",
      "usually 5-14 words",
      "compact checklists, not essays",
      "create_research_task",
      'targetKind="hypothesis"',
      "per-turn ResearchTask budget",
      "one ResearchTask per independent candidate direction",
      "do not bundle multiple exploit variants",
      "create_experiment.parentExperimentId",
      "Compare only verified results when deciding whether to branch, retry, prune, ask the user, or report.",
      "search_research_tasks",
      "search_hypotheses",
      "search_baselines",
      "search_experiments",
      "search_evaluations",
      "list_measurements",
      "list_artifacts",
      "list_entity_links",
      "run_readonly_workspace_command",
      "inspect the relevant files enough",
      "batch-size or memory constants",
      "directly coupled invariants",
      "objective, constraints, sanity checks, run/evidence requirements, and acceptance criteria",
      "brittle literal edit recipe",
      "preserve evaluation/data comparability",
      "crash/OOM/timeout evidence",
      "type: explore, exploit, debug, verify, synthesize, or prune.",
    ]);
    expectForbiddenMarkers(output, [...forbiddenAcrossAllCases, "Call create_baseline"]);
  });

  test("interactive onboarding emits user-checkpoint and baseline-handshake markers", () => {
    const project = researchProject({
      id: "research-project-onboarding-1",
      phase: "onboarding",
      goal: "Explore the codebase, create a durable project setup baseline, and wait for user approval.",
    });
    const interaction = researchProjectInteraction({
      id: "interaction-question-1",
      prompt: "What should define success?",
      status: "answered",
      response: "Use the existing test suite pass rate.",
    });
    const output = managerResearchProjectPrompt({
      researchProject: project,
      interactions: [interaction],
      researchTasks: [],
      verifications: [],
      plannedTaskBudget: 3,
    });
    expectRequiredMarkers(output, [
      "You are situ Manager. Drive one ResearchProject",
      "ResearchProject id: research-project-onboarding-1",
      "Phase: onboarding",
      "Research goal: Explore the codebase, create a durable project setup baseline, and wait for user approval.",
      "Prior user checkpoints:",
      "- question interaction-question-1 (answered)",
      "Prompt: What should define success?",
      "User response: Use the existing test suite pass rate.",
      "search_research_tasks",
      "search_hypotheses",
      "search_baselines",
      "search_experiments",
      "search_evaluations",
      "list_measurements",
      "list_artifacts",
      "list_entity_links",
      "run_readonly_workspace_command",
      "inspect the relevant files enough",
      "batch-size or memory constants",
      "directly coupled invariants",
      "Record writing style:",
      "Write record text in a human-sounding way",
      "compact checklists, not essays",
      "ask_user_question",
      "create_project_baseline",
      "Manager-owned setup state",
      "present_baseline_for_confirmation",
      "headless exec auto-confirms baseline confirmations only after the baseline is durable",
      "Do not call create_research_task until the ResearchProject phase is search.",
      "Never treat a pending confirmation as approval.",
      "verified evidence or reporting-phase final output",
      "Each ResearchTask must include workerPrompt assignment prose and a verificationPrompt.",
      "For type verify, workerPrompt is the Verifier assignment.",
      "objective, constraints, sanity checks, run/evidence requirements, and acceptance criteria",
      "brittle literal edit recipe",
      "preserve evaluation/data comparability",
      "crash/OOM/timeout evidence",
      "per-turn ResearchTask budget",
      "one ResearchTask per independent candidate direction",
      "do not bundle multiple exploit variants",
      "create_experiment.parentExperimentId",
      "no Scientist worker will run",
      "complete_research_project",
      "fail_research_project",
      "Do not leave the ResearchProject in progress",
      "Compare only verified results when deciding whether to branch, retry, prune, ask the user, or report.",
    ]);
    expectForbiddenMarkers(output, [...forbiddenAcrossAllCases, "ResearchRun"]);
  });

  test("headless onboarding omits interactive question instruction and emits headless guidance", () => {
    const project = researchProject({
      id: "research-project-headless-1",
      phase: "onboarding",
      goal: "Explore the codebase and proceed without interactive questions.",
      payloadJson: JSON.stringify({ executionMode: "headless", headless: true }),
    });
    const output = managerResearchProjectPrompt({
      researchProject: project,
      interactions: [],
      researchTasks: [],
      verifications: [],
      plannedTaskBudget: 3,
    });
    expectRequiredMarkers(output, [
      "ResearchProject id: research-project-headless-1",
      "Execution mode: headless",
      "Headless exec mode: do not call ask_user_question",
      "explicit assumptions in create_project_baseline",
      "fail_research_project",
      "Do not call create_research_task until the ResearchProject phase is search.",
    ]);
    expectForbiddenMarkers(output, ["call ask_user_question with one concrete blocking question"]);
  });
});

describe("scientistResearchTaskPrompt", () => {
  test("emits evidence-path procedure and skill-boundary markers for an exploit task", () => {
    const exploitTask = task({
      id: "research-task-science-1",
      type: "exploit",
      researchProjectId: "research-project-eval-1",
      title: "Measure local release smoke",
      workerPrompt: "Run the smallest useful release smoke and record the outcome.",
      verificationPrompt:
        "Confirm the command output, baseline comparison, and artifacts are durable.",
    });
    const output = scientistResearchTaskPrompt({ researchTask: exploitTask });
    expectRequiredMarkers(output, [
      "You are situ Scientist. Execute one ResearchTask workerPrompt.",
      "ResearchTask id: research-task-science-1",
      "ResearchTask type: exploit",
      "Target: none",
      "workerPrompt",
      "verificationPrompt",
      "get_research_task",
      "ResearchTask type, workerPrompt, and verificationPrompt",
      "situ-scientist-explore-task",
      "situ-scientist-exploit-task",
      "situ-scientist-debug-task",
      "situ-scientist-synthesize-task",
      "situ-scientist-prune-task",
      "Follow that skill's allowed and forbidden tool boundaries.",
      "Output style:",
      "Use short record text",
      "compact human-sounding summary notes",
      "brief evidence bullets",
      "Keep full durable record ids",
      "Explore tasks may create_hypothesis",
      "run_readonly_workspace_command",
      "may use run_workspace_command when an isolated baseline worktree is needed",
      "create_experiment requires associatedHypothesisId unless",
      "parentExperimentId to create_experiment",
      "parent candidate commit",
      "If workerPrompt gives an exact recipe",
      "directly coupled assertions",
      "compatibility fixes",
      "For long-running commands",
      "launch the command in the background",
      "write pid/status/log files",
      "poll with short follow-up command calls",
      "wait for fresh metrics or failure evidence",
      "type verify is Verifier-owned",
      "fail_research_task",
      "submit_research_task_for_verification",
      "Do not claim final success.",
      "full durable record ids exactly as returned by tools",
      "If the workerPrompt cannot produce durable science output, call fail_research_task and explain why.",
    ]);
    expectForbiddenMarkers(output, ["Critic", "ResearchMove", "AgentObjective"]);
  });
});

describe("verifierResearchTaskPrompt lineage block", () => {
  test("renders a no-lineage line when no ancestors are passed", () => {
    const prompt = verifierResearchTaskPrompt({ researchTask: verifierTask(), lineage: [] });
    expect(prompt).toContain("Lineage:\n- No parent experiment chain for this candidate.");
  });

  test("renders ancestor chain with depth, ids, status, title, and commit", () => {
    const lineage: VerifierLineageAncestor[] = [
      ancestor({
        experimentId: "exp_anchor_b",
        title: "first+last anchor cascading fallback",
        status: "accepted",
        candidateCommit: "7c46d73",
      }),
      ancestor({
        experimentId: "exp_anchor_a",
        title: "anchor + extra-vocab fallback stacked",
        status: "accepted",
        candidateCommit: "f6fed76",
      }),
    ];
    const prompt = verifierResearchTaskPrompt({ researchTask: verifierTask(), lineage });
    expect(prompt).toContain("Lineage:\n- This candidate sits 3 deep in its exploit chain");
    expect(prompt).toContain(
      "1. exp_anchor_b (accepted) — first+last anchor cascading fallback @ 7c46d73",
    );
    expect(prompt).toContain(
      "2. exp_anchor_a (accepted) — anchor + extra-vocab fallback stacked @ f6fed76",
    );
  });

  test("the long-chain noise-floor instruction names the configured depth", () => {
    const prompt = verifierResearchTaskPrompt({ researchTask: verifierTask(), lineage: [] });
    expect(prompt).toContain(`${VERIFIER_LINEAGE_NOISE_FLOOR_DEPTH}+ rungs deep`);
  });
});

describe("verifierResearchTaskPrompt", () => {
  test("emits Verifier identity, procedure, tool, and verdict markers", () => {
    const verifyTask = task({
      id: "research-task-verify-1",
      type: "verify",
      title: "Release smoke is sufficient",
      workerPrompt: "Run the smallest useful release smoke and record the outcome.",
      verificationPrompt: "Confirm the command, output, and baseline comparison are captured.",
      status: "awaiting_verification",
      resultSummary: "Release smoke completed and wrote a measurement artifact.",
    });
    const output = verifierResearchTaskPrompt({ researchTask: verifyTask, lineage: [] });
    expectRequiredMarkers(output, [
      "You are situ Verifier.",
      "Review one ResearchTask before it can count as progress.",
      "ResearchTask id: research-task-verify-1",
      "Title: Release smoke is sufficient",
      "Target: none",
      "workerPrompt",
      "verificationPrompt",
      "get_research_task",
      "search_hypotheses",
      "search_research_tasks",
      "search_baselines",
      "search_experiments",
      "search_evaluations",
      "list_measurements",
      "list_artifacts",
      "list_entity_links",
      "situ-verifier-verify-task",
      "record_research_task_verification",
      "Output style:",
      "one clear judgment sentence",
      "short evidence summary",
      "run_readonly_workspace_command",
      "do not create or mutate experiment worktrees",
      "missing primary hypothesis",
      "missing or wrong parentExperimentId on deepening experiments",
      "full durable record ids exactly as returned by tools",
      "status passed, failed, suspicious, or needs_more_evidence",
      "requires a non-empty evidenceSummary",
      "needs_more_evidence reopens the task as planned work",
      "evidence-backed judgment",
    ]);
    expectForbiddenMarkers(output, [
      "Critic",
      "accept_hypothesis",
      "submit_hypothesis",
      "complete_hypothesis",
      "cancel_hypothesis",
      "fail_hypothesis",
      "add_hypothesis_comment",
      "run_workspace_command",
    ]);
  });
});

function verifierTask(overrides: Partial<ResearchTaskRecord> = {}): ResearchTaskRecord {
  return task({
    id: overrides.id ?? "t_verify",
    type: overrides.type ?? "exploit",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    ...overrides,
  });
}

function ancestor(input: VerifierLineageAncestor): VerifierLineageAncestor {
  return input;
}

function task(
  overrides: Partial<ResearchTaskRecord> & Pick<ResearchTaskRecord, "id" | "type">,
): ResearchTaskRecord {
  const createdAt = overrides.createdAt ?? "2026-01-01T00:00:00.000Z";
  return {
    id: overrides.id,
    researchProjectId: overrides.researchProjectId ?? "proj_test",
    parentResearchTaskId: overrides.parentResearchTaskId ?? null,
    type: overrides.type,
    title: overrides.title ?? "Task",
    workerPrompt: overrides.workerPrompt ?? "do the thing",
    verificationPrompt: overrides.verificationPrompt ?? "verify the thing",
    status: overrides.status ?? "planned",
    priority: overrides.priority ?? "normal",
    targetKind: overrides.targetKind ?? null,
    targetId: overrides.targetId ?? null,
    resultSummary: overrides.resultSummary ?? null,
    createdByAgentId: overrides.createdByAgentId ?? null,
    payloadJson: overrides.payloadJson ?? "{}",
    syncVersion: overrides.syncVersion ?? 1,
    syncDeleted: overrides.syncDeleted ?? false,
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
  };
}

function researchProject(
  overrides: Partial<ResearchProjectRecord> & Pick<ResearchProjectRecord, "id" | "goal">,
): ResearchProjectRecord {
  return {
    id: overrides.id,
    goal: overrides.goal,
    phase: overrides.phase ?? "onboarding",
    status: overrides.status ?? "active",
    baselineSummary: overrides.baselineSummary ?? null,
    resultSummary: overrides.resultSummary ?? null,
    createdByAgentId: overrides.createdByAgentId ?? null,
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    payloadJson: overrides.payloadJson ?? "{}",
    syncVersion: overrides.syncVersion ?? 1,
    syncDeleted: overrides.syncDeleted ?? false,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

function researchProjectInteraction(
  overrides: Partial<ResearchProjectInteractionRecord> &
    Pick<ResearchProjectInteractionRecord, "id" | "prompt">,
): ResearchProjectInteractionRecord {
  return {
    id: overrides.id,
    researchProjectId: overrides.researchProjectId ?? "proj_test",
    kind: overrides.kind ?? "question",
    prompt: overrides.prompt,
    details: overrides.details ?? "",
    status: overrides.status ?? "answered",
    response: overrides.response ?? null,
    createdByAgentId: overrides.createdByAgentId ?? null,
    resolvedAt: overrides.resolvedAt ?? null,
    payloadJson: overrides.payloadJson ?? "{}",
    syncVersion: overrides.syncVersion ?? 1,
    syncDeleted: overrides.syncDeleted ?? false,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}
