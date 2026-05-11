import { evalite } from "evalite";

import * as promptModule from "../../app/src/claude/agents/runs/prompts";
import { normalizeMarkerText, type MarkerExpectation } from "./scorers/marker-scorer";

type PromptExpectations = MarkerExpectation;

type PromptFunction = (input: Record<string, unknown>) => string;

type ResearchTaskFixture = Readonly<{
  id: string;
  kind: string;
  type: string;
  researchProjectId: string;
  parentResearchTaskId: string | null;
  title: string;
  targetKind: string | null;
  targetId: string | null;
  content: string;
  workerPrompt: string;
  verificationPrompt: string;
  status: string;
  priority: string;
  resultSummary: string | null;
  payload: Record<string, unknown>;
  payloadJson: string;
}>;

type ResearchProjectFixture = Readonly<{
  id: string;
  title: string;
  content: string;
  goal: string;
  baselineSummary: string | null;
  phase: string;
  status: string;
  priority: string;
  payloadJson: string;
}>;

type ResearchProjectInteractionFixture = Readonly<{
  id: string;
  kind: string;
  prompt: string;
  details: string;
  status: string;
  response: string;
}>;

type ResearchTaskVerificationFixture = Readonly<{
  id: string;
  researchTaskId: string;
  title: string;
  summary: string;
  status: string;
  workerPrompt: string;
  verificationPrompt: string;
  workerResult: string;
  evidenceSummary: string;
}>;

const managerResearchProjectPrompt = promptFunction({
  names: ["managerResearchProjectPrompt"],
});
const scientistResearchTaskPrompt = promptFunction({
  names: ["scientistResearchTaskPrompt", "scientistTaskPrompt"],
});
const verifierResearchTaskPrompt = promptFunction({
  names: ["verifierResearchTaskPrompt", "researchTaskVerifierPrompt"],
});

const requiredMarkers = {
  name: "required-markers",
  description: "All required prompt markers are present and forbidden markers are absent.",
  scorer: ({ output, expected }: { output: string; expected: PromptExpectations }) => {
    const normalizedOutput = normalizeMarkerText({ value: output });
    const missing = expected.required.filter(
      (marker) => !normalizedOutput.includes(normalizeMarkerText({ value: marker })),
    );
    const forbiddenHits = (expected.forbidden ?? []).filter((marker) =>
      normalizedOutput.includes(normalizeMarkerText({ value: marker })),
    );

    return {
      score: missing.length === 0 && forbiddenHits.length === 0 ? 1 : 0,
      metadata: { missing, forbiddenHits },
    };
  },
};

function promptFunction({ names }: { names: string[] }): PromptFunction {
  const moduleRecord = promptModule as Record<string, unknown>;
  for (const name of names) {
    const candidate = moduleRecord[name];
    if (typeof candidate === "function") {
      return candidate as PromptFunction;
    }
  }
  throw new Error(`None of these prompt functions are exported: ${names.join(", ")}`);
}

function researchTask(overrides: Partial<ResearchTaskFixture>): ResearchTaskFixture {
  const workerPrompt = "Map the current release and verification path.";
  const verificationPrompt = "Check that every claim cites durable evidence.";
  const payload = {
    workerPrompt,
    verificationPrompt,
    researchTaskType: "explore",
  };
  return {
    id: "research-task-eval-1",
    kind: "explore",
    type: "explore",
    researchProjectId: "research-project-eval-1",
    parentResearchTaskId: null,
    title: "Investigate current workflow",
    targetKind: null,
    targetId: null,
    content: workerPrompt,
    workerPrompt,
    verificationPrompt,
    status: "backlog",
    priority: "normal",
    resultSummary: null,
    payload,
    payloadJson: JSON.stringify(payload),
    ...overrides,
  };
}

function researchProject(overrides: Partial<ResearchProjectFixture>): ResearchProjectFixture {
  return {
    id: "research-project-eval-1",
    title: "Prepare onboarding baseline",
    content: "Understand the repository and prepare an approval checkpoint.",
    goal: "Understand the repository and prepare an approval checkpoint.",
    baselineSummary: null,
    phase: "onboarding",
    status: "in_progress",
    priority: "high",
    payloadJson: "{}",
    ...overrides,
  };
}

function researchProjectInteraction(
  overrides: Partial<ResearchProjectInteractionFixture>,
): ResearchProjectInteractionFixture {
  return {
    id: "interaction-eval-1",
    kind: "question",
    prompt: "Which baseline metric matters most?",
    details: "The manager needs one measurable target before proceeding.",
    status: "answered",
    response: "Use the existing test suite pass rate.",
    ...overrides,
  };
}

function researchTaskVerification(
  overrides: Partial<ResearchTaskVerificationFixture>,
): ResearchTaskVerificationFixture {
  return {
    id: "research-task-verification-eval-1",
    researchTaskId: "research-task-verify-1",
    title: "Verify release smoke evidence",
    summary: "The worker result should count only if the command output is durable.",
    status: "in_review",
    workerPrompt: "Run the smallest useful release smoke and record the outcome.",
    verificationPrompt: "Confirm the command, output, and baseline comparison are captured.",
    workerResult: "Release smoke completed and wrote a measurement artifact.",
    evidenceSummary: "Measurement M1 and artifact A1 contain stdout and command metadata.",
    ...overrides,
  };
}

evalite("manager planning prompt", {
  data: [
    {
      input: researchProject({
        id: "research-project-plan-1",
        title: "Plan distribution work",
        content: "Inventory local release scripts and GitHub release workflow.",
        goal: "Inventory local release scripts and GitHub release workflow.",
      }),
      expected: {
        required: [
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
        ],
        forbidden: [
          "AgentObjective",
          "ResearchMove",
          "Critic",
          "create_analysis",
          "Call create_baseline",
        ],
      },
    },
  ],
  task: (input) =>
    managerResearchProjectPrompt({
      researchProject: input,
      interactions: [],
      researchTasks: [],
      verifications: [],
    }),
  scorers: [requiredMarkers],
});

evalite("manager research project prompt onboarding checkpoints", {
  data: [
    {
      input: {
        researchProject: researchProject({
          id: "research-project-onboarding-1",
          title: "Baseline before research",
          content:
            "Explore the codebase, create a durable project setup baseline, and wait for user approval.",
          goal: "Explore the codebase, create a durable project setup baseline, and wait for user approval.",
        }),
        interactions: [
          researchProjectInteraction({
            id: "interaction-question-1",
            prompt: "What should define success?",
          }),
        ],
      },
      expected: {
        required: [
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
        ],
        forbidden: ["AgentObjective", "ResearchRun", "ResearchMove", "Critic", "create_analysis"],
      },
    },
    {
      input: {
        researchProject: researchProject({
          id: "research-project-headless-1",
          title: "Headless baseline before research",
          content: "Explore the codebase and proceed without interactive questions.",
          goal: "Explore the codebase and proceed without interactive questions.",
          payloadJson: JSON.stringify({
            executionMode: "headless",
            headless: true,
          }),
        }),
        interactions: [],
      },
      expected: {
        required: [
          "ResearchProject id: research-project-headless-1",
          "Execution mode: headless",
          "Headless exec mode: do not call ask_user_question",
          "explicit assumptions in create_project_baseline",
          "fail_research_project",
          "Do not call create_research_task until the ResearchProject phase is search.",
        ],
        forbidden: ["call ask_user_question with one concrete blocking question"],
      },
    },
  ],
  task: (input) =>
    managerResearchProjectPrompt({
      researchProject: input.researchProject,
      interactions: input.interactions,
      researchTasks: [],
      verifications: [],
    }),
  scorers: [requiredMarkers],
});

evalite("scientist research task prompt evidence path", {
  data: [
    {
      input: researchTask({
        id: "research-task-science-1",
        kind: "experiment",
        type: "exploit",
        researchProjectId: "research-project-eval-1",
        title: "Measure local release smoke",
        workerPrompt: "Run the smallest useful release smoke and record the outcome.",
        verificationPrompt:
          "Confirm the command output, baseline comparison, and artifacts are durable.",
        content: "Run the smallest useful release smoke and record the outcome.",
        payload: {
          workerPrompt: "Run the smallest useful release smoke and record the outcome.",
          verificationPrompt:
            "Confirm the command output, baseline comparison, and artifacts are durable.",
          researchTaskType: "exploit",
        },
        payloadJson: JSON.stringify({
          workerPrompt: "Run the smallest useful release smoke and record the outcome.",
          verificationPrompt:
            "Confirm the command output, baseline comparison, and artifacts are durable.",
          researchTaskType: "exploit",
        }),
      }),
      expected: {
        required: [
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
        ],
        forbidden: ["Critic", "ResearchMove", "AgentObjective"],
      },
    },
  ],
  task: (input) => scientistResearchTaskPrompt({ researchTask: input, task: input }),
  scorers: [requiredMarkers],
});

evalite("verifier research task verification prompt", {
  data: [
    {
      input: researchTaskVerification({
        id: "research-task-verification-1",
        researchTaskId: "research-task-verify-1",
        title: "Release smoke is sufficient",
        summary: "The local release smoke should catch packaging regressions before publishing.",
      }),
      expected: {
        required: [
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
        ],
        forbidden: [
          "Critic",
          "accept_hypothesis",
          "submit_hypothesis",
          "complete_hypothesis",
          "cancel_hypothesis",
          "fail_hypothesis",
          "add_hypothesis_comment",
          "run_workspace_command",
        ],
      },
    },
  ],
  task: (input) =>
    verifierResearchTaskPrompt({
      researchTaskVerification: input,
      verification: input,
      researchTask: {
        id: input.researchTaskId,
        title: input.title,
        kind: "verify",
        type: "verify",
        researchProjectId: "research-project-eval-1",
        parentResearchTaskId: null,
        status: "in_review",
        priority: "high",
        resultSummary: input.workerResult,
        content: input.workerPrompt,
        payloadJson: JSON.stringify({
          workerPrompt: input.workerPrompt,
          verificationPrompt: input.verificationPrompt,
          researchTaskType: "verify",
        }),
        workerPrompt: input.workerPrompt,
        verificationPrompt: input.verificationPrompt,
      },
      task: {
        id: input.researchTaskId,
        title: input.title,
        kind: "verify",
        type: "verify",
        researchProjectId: "research-project-eval-1",
        parentResearchTaskId: null,
        status: "in_review",
        priority: "high",
        resultSummary: input.workerResult,
        content: input.workerPrompt,
        payloadJson: JSON.stringify({
          workerPrompt: input.workerPrompt,
          verificationPrompt: input.verificationPrompt,
          researchTaskType: "verify",
        }),
      },
      hypothesis: {
        id: input.researchTaskId,
        title: input.title,
        summary: input.summary,
      },
    }),
  scorers: [requiredMarkers],
});
