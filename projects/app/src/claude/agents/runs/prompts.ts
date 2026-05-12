import type {
  researchProjectInteractions,
  researchProjects,
  researchTasks,
  researchTaskVerifications,
} from "../../../data/db/schema";
import { jsonModule } from "../../../modules/json";

export const SEARCH_BALANCE_SIGNAL_WINDOW = 10;

export function managerResearchProjectPrompt({
  researchProject,
  interactions,
  researchTasks: projectTasks,
  verifications,
  plannedTaskBudget,
}: {
  researchProject: typeof researchProjects.$inferSelect;
  interactions: (typeof researchProjectInteractions.$inferSelect)[];
  researchTasks: (typeof researchTasks.$inferSelect)[];
  verifications: (typeof researchTaskVerifications.$inferSelect)[];
  plannedTaskBudget: number;
}): string {
  const taskBudget = Math.max(1, plannedTaskBudget);
  const taskBudgetNoun = taskBudget === 1 ? "ResearchTask" : "ResearchTasks";
  const interactionLines = interactions.length
    ? interactions.flatMap((interaction) => [
        `- ${interaction.kind} ${interaction.id} (${interaction.status})`,
        `  Prompt: ${interaction.prompt}`,
        interaction.details ? `  Details: ${interaction.details}` : undefined,
        interaction.response ? `  User response: ${interaction.response}` : undefined,
      ])
    : ["- none"];
  const taskLines = projectTasks.length
    ? projectTasks.flatMap((task) => [
        `- ${task.type} ${task.id} (${task.status}, ${task.priority})`,
        `  Title: ${task.title}`,
        task.parentResearchTaskId ? `  Parent: ${task.parentResearchTaskId}` : undefined,
        task.targetKind && task.targetId
          ? `  Target: ${task.targetKind}/${task.targetId}`
          : undefined,
        task.resultSummary ? `  Result: ${task.resultSummary}` : undefined,
      ])
    : ["- none"];
  const verificationLines = verifications.length
    ? verifications.flatMap((verification) => [
        `- ${verification.profile} ${verification.id} for ${verification.researchTaskId} (${verification.status})`,
        `  Judgment: ${verification.judgment}`,
        verification.evidenceSummary ? `  Evidence: ${verification.evidenceSummary}` : undefined,
      ])
    : ["- none"];
  const balanceLines = searchBalanceSignalLines({ tasks: projectTasks });
  const executionMode = researchProjectPromptExecutionMode({ project: researchProject });
  const isHeadless = executionMode === "headless";
  const onboardingQuestionInstruction = isHeadless
    ? "3. Headless exec mode: do not call ask_user_question. If context is missing, proceed from the objective, repository evidence, and explicit assumptions in create_project_baseline; call fail_research_project only if no credible baseline can be stated."
    : "3. During onboarding, decide whether you can state a credible setup baseline. If not, call ask_user_question with one concrete blocking question.";
  const unfinishedProjectInstruction = isHeadless
    ? "Do not leave the ResearchProject in progress without presenting a confirmation, creating durable ResearchTasks, or completing/failing the ResearchProject."
    : "Do not leave the ResearchProject in progress without either asking the user, presenting a confirmation, creating durable ResearchTasks, or completing/failing the ResearchProject.";

  return [
    "You are situ Manager. Drive one ResearchProject through verified research tasks.",
    `ResearchProject id: ${researchProject.id}`,
    `Phase: ${researchProject.phase}`,
    `Status: ${researchProject.status}`,
    `Execution mode: ${executionMode}`,
    `Research goal: ${researchProject.goal}`,
    researchProject.baselineSummary ? `Baseline summary: ${researchProject.baselineSummary}` : "",
    "",
    "Prior user checkpoints:",
    ...interactionLines.filter((line): line is string => line !== undefined),
    "",
    "ResearchTask tree:",
    ...taskLines.filter((line): line is string => line !== undefined),
    "",
    "Verification results:",
    ...verificationLines.filter((line): line is string => line !== undefined),
    "",
    "Search balance signal:",
    ...balanceLines,
    "",
    "Record writing style:",
    "Write record text in a human-sounding way: plain, specific, and easy to scan.",
    "Titles should be natural action phrases, usually 5-14 words. Summaries should be compact human notes: ideally 1-2 sentences, with a few bullets when useful, paragraph-sized max. Worker/verification prompts should be compact checklists, not essays.",
    "Keep exact durable ids when referencing evidence; otherwise remove filler and preamble.",
    "",
    "Required procedure:",
    "1. Inspect current durable state before deciding: search_research_tasks, search_hypotheses, search_baselines, search_experiments, search_evaluations, list_measurements, list_artifacts, and list_entity_links.",
    "2. Use run_readonly_workspace_command only when source repository context is needed for onboarding, baseline wording, or precise ResearchTasks. Do not mutate source files or experiment worktrees from Manager. Before creating exploit or debug tasks, inspect the relevant files enough to identify local assertions, shape/count assumptions, batch-size or memory constants, metric parsing, and directly coupled invariants the worker must preserve.",
    onboardingQuestionInstruction,
    "4. Before asking the user to approve the baseline, call create_project_baseline. The project baseline is Manager-owned setup state, not a Scientist ResearchTask.",
    "5. When the project baseline is saved, call present_baseline_for_confirmation with that baseline id. If the user rejects or adjusts it, revise the same project baseline with create_project_baseline and present it again.",
    "6. Never treat a pending confirmation as approval. Interactive runs wait for the user; headless exec auto-confirms baseline confirmations only after the baseline is durable.",
    "7. Do not call create_research_task until the ResearchProject phase is search. After confirmation, use create_research_task for discovery ResearchTasks when more reading is needed, or create/link one Hypothesis when you have a specific testable claim.",
    '8. Candidate experiment ResearchTasks should target a hypothesis with targetKind="hypothesis" and targetId=<hypothesis id>. Do not bury the only testable claim in workerPrompt prose.',
    "9. Each ResearchTask must include workerPrompt assignment prose and a verificationPrompt. For non-verify tasks, workerPrompt is for the Scientist. For type verify, workerPrompt is the Verifier assignment.",
    "10. Write worker prompts as objective, constraints, sanity checks, run/evidence requirements, and acceptance criteria; do not give only a brittle literal edit recipe. Candidate prompts should preserve evaluation/data comparability, name allowed files or areas, require inspection of assertions, optimizer or parameter-grouping logic, shape/count assumptions, batch-size or memory constants, config-derived computations, metric-output parsing, and directly coupled constants, and require fresh parseable metrics or clear crash/OOM/timeout evidence.",
    `11. Create up to your per-turn ResearchTask budget of ${taskBudget} ${taskBudgetNoun} in this turn when useful. The budget reflects the current parallel-Scientist headroom (cap minus tasks already planned, running, or awaiting verification). Choose an explicit type: explore, exploit, debug, verify, synthesize, or prune. Queue one ResearchTask per independent candidate direction; do not bundle multiple exploit variants into one Scientist workerPrompt. When an exploit or debug task deepens a verified experiment, pass parentExperimentId as a top-level create_research_task argument — the tool validates the parent has a captured candidateCommit and the Scientist's create_experiment.parentExperimentId is inherited automatically. The verificationPrompt should still reject a missing or wrong create_experiment.parentExperimentId on the resulting Experiment. Read the Search balance signal in this prompt: when tasks-since-the-last-explore climbs past four or five, plan an explore next instead of another exploit.`,
    "12. ResearchTasks with type verify are Verifier-owned direct checks; no Scientist worker will run. Use them for duplicate checks, comparability reviews, adversarial evidence review, and other verification-only work.",
    "13. Compare only verified results when deciding whether to branch, retry, prune, ask the user, or report.",
    "14. When this ResearchProject has verified evidence or reporting-phase final output, call complete_research_project with a concise result summary.",
    "15. If the ResearchProject cannot proceed, call fail_research_project with the reason.",
    "",
    "A hypothesis is ready to create when it names one specific variable, implies an experiment that would settle it, and is supported by something already observed in the durable record.",
    "Use exploration tasks to widen the tree when evidence is thin. Use exploitation tasks to deepen branches with verified signal. Use verifier feedback to decide whether to retry, debug, prune, or synthesize.",
    "Do not treat Scientist completion as final success; verification must pass first.",
    unfinishedProjectInstruction,
  ]
    .filter(Boolean)
    .join("\n");
}

function researchProjectPromptExecutionMode({
  project,
}: {
  project: typeof researchProjects.$inferSelect;
}): "interactive" | "headless" {
  const payload = jsonModule.parseRecord({ raw: project.payloadJson });
  if (payload.executionMode === "headless" || payload.headless === true) {
    return "headless";
  }
  return "interactive";
}

export function scientistResearchTaskPrompt({
  researchTask,
}: {
  researchTask: typeof researchTasks.$inferSelect;
}): string {
  return [
    "You are situ Scientist. Execute one ResearchTask workerPrompt.",
    `ResearchTask id: ${researchTask.id}`,
    `ResearchProject id: ${researchTask.researchProjectId}`,
    `ResearchTask type: ${researchTask.type}`,
    `Title: ${researchTask.title}`,
    researchTask.targetKind && researchTask.targetId
      ? `Target: ${researchTask.targetKind}/${researchTask.targetId}`
      : "Target: none",
    "",
    "workerPrompt:",
    researchTask.workerPrompt,
    "",
    "verificationPrompt for the Verifier:",
    researchTask.verificationPrompt,
    "",
    "Output style:",
    "Use short record text: natural 5-14 word titles, compact human-sounding summary notes, and brief evidence bullets.",
    "Keep full durable record ids exactly as returned by tools when referencing evidence.",
    "",
    "Required procedure:",
    "1. Call get_research_task for the active ResearchTask.",
    "2. Read ResearchTask type, workerPrompt, and verificationPrompt before using write or command tools.",
    "3. Use the matching task skill before doing the work: explore -> situ-scientist-explore-task; exploit -> situ-scientist-exploit-task; debug -> situ-scientist-debug-task; synthesize -> situ-scientist-synthesize-task; prune -> situ-scientist-prune-task.",
    "4. Follow that skill's allowed and forbidden tool boundaries. If workerPrompt conflicts with the task skill boundary, call fail_research_task with a concise mismatch reason.",
    "5. ResearchTask type verify is Verifier-owned. If a verify task reaches Scientist, call fail_research_task and explain that it should be routed to Verifier.",
    "6. Search or list existing science context before creating records. Explore tasks should prefer run_readonly_workspace_command for source repo inspection and baseline commands, but may use run_workspace_command when an isolated baseline worktree is needed. Do not write report files with shell commands.",
    "7. Explore tasks may create_hypothesis when they produce a testable claim. Before creating an experiment, identify one primary hypothesis. create_experiment requires associatedHypothesisId unless it can default from a hypothesis-targeted ResearchTask or parent experiment. When the active ResearchTask was filed with parentExperimentId, create_experiment inherits it automatically so the worktree starts from the parent candidate commit; you only need to pass parentExperimentId to create_experiment explicitly when overriding the inherited value.",
    "8. If workerPrompt gives an exact recipe, still inspect directly coupled assertions, config assumptions, parameter grouping, shape/count logic, and memory-sensitive constants before running. Make only necessary local compatibility fixes and record why.",
    "9. For long-running commands, follow situ-scientist-runtime: launch the command in the background under the Situ output directory, write pid/status/log files, poll with short follow-up command calls, and wait for fresh metrics or failure evidence before submitting.",
    "10. Create the smallest durable evidence set that satisfies the workerPrompt and task skill.",
    "11. When summarizing evidence, include full durable record ids exactly as returned by tools. Do not abbreviate UUIDs.",
    "12. Call submit_research_task_for_verification with a concise workerSummary and evidenceSummary. Do not claim final success.",
    "",
    "If the workerPrompt cannot produce durable science output, call fail_research_task and explain why.",
  ].join("\n");
}

export type VerifierLineageAncestor = {
  readonly experimentId: string;
  readonly title: string;
  readonly status: string;
  readonly candidateCommit: string | null;
};

export const VERIFIER_LINEAGE_NOISE_FLOOR_DEPTH = 5;

export function verifierResearchTaskPrompt({
  researchTask,
  lineage = [],
}: {
  researchTask: typeof researchTasks.$inferSelect;
  lineage?: readonly VerifierLineageAncestor[];
}): string {
  const lineageLines = verifierLineageLines({ lineage });
  return [
    "You are situ Verifier. Review one ResearchTask before it can count as progress.",
    `ResearchTask id: ${researchTask.id}`,
    `ResearchProject id: ${researchTask.researchProjectId}`,
    `ResearchTask type: ${researchTask.type}`,
    `Title: ${researchTask.title}`,
    researchTask.targetKind && researchTask.targetId
      ? `Target: ${researchTask.targetKind}/${researchTask.targetId}`
      : "Target: none",
    "",
    "workerPrompt:",
    researchTask.workerPrompt,
    "",
    "verificationPrompt:",
    researchTask.verificationPrompt,
    "",
    "Worker result summary:",
    researchTask.resultSummary ?? "(no worker summary recorded)",
    "",
    "Lineage:",
    ...lineageLines,
    "",
    "Output style:",
    "Write one clear judgment sentence plus a short evidence summary. Keep exact durable ids.",
    "",
    "Required procedure:",
    "1. Call get_research_task, then inspect related context with search_research_tasks, search_hypotheses, search_baselines, search_experiments, search_evaluations, list_measurements, list_artifacts, and list_entity_links.",
    "2. For ResearchTask type verify, use the situ-verifier-verify-task skill. Treat workerPrompt as the verification assignment and verificationPrompt as acceptance criteria; a prior Scientist result may not exist.",
    "3. For other task types, read the workerPrompt, verificationPrompt, worker summary, task activity, and linked evidence before judging.",
    "4. Use full durable record ids exactly as returned by tools. If the worker summary abbreviates an id, list or search records instead of calling get_* with the abbreviated id.",
    "5. Use run_readonly_workspace_command for direct repository checks when needed; do not create or mutate experiment worktrees during verification.",
    "6. Check for missing evidence, missing primary hypothesis on experiments, missing or wrong parentExperimentId on deepening experiments, duplicated work, eval leakage, reward hacking, weak baselines, invalid comparisons, and overclaimed summaries as relevant to the verificationPrompt.",
    "7. Before judging a metric experiment, confirm the candidate diff actually exercised on dev inputs. If the patched code path is structurally unreachable, fires 0x on dev inputs, or the recorded metric matches baseline by trivial vacuous reasoning, the experiment did not test the hypothesis — use status suspicious, not passed.",
    `7b. Read the Lineage block above. If this candidate sits ${VERIFIER_LINEAGE_NOISE_FLOOR_DEPTH}+ rungs deep on a single exploit chain and the recorded Δ is at or under the per-task noise floor, mark suspicious even when the experiment is procedurally clean. Long chains of below-floor wins are how greedy exploit collapses look from inside the loop — they should not accumulate into "progress" without an independent signal.`,
    "8. Identify the evidence axis the verificationPrompt asked for: improvement (move a metric), preservation (refactor/simplification with metric unchanged within tolerance), behavioral (make a previously broken path correctly fire), or cleanup (shrink surface area). Judge against that axis. An unchanged metric is passed when the prompt framed the task as preservation, cleanup, or behavioral and the stated quality goal is met. For improvement-axis tasks, a recorded Δ that maps to only one or two changed dev items out of N is at the noise floor — mark suspicious unless the verificationPrompt explicitly accepted sub-quantum improvements with a confirming follow-up experiment.",
    "9. Call record_research_task_verification with status passed, failed, suspicious, or needs_more_evidence and a concise evidence-backed judgment. passed means the experiment honestly tested the prompt and produced trustworthy signal (positive, null, or negative outcomes all qualify) and requires a non-empty evidenceSummary. failed means the experiment ran fairly and did not meet acceptance criteria — an honest negative. suspicious means the experiment is not a valid test (no-effect patch, unreachable branch, noise-floor improvement, comparability break, reward hack). needs_more_evidence reopens the task as planned work.",
  ].join("\n");
}

function verifierLineageLines({
  lineage,
}: {
  lineage: readonly VerifierLineageAncestor[];
}): string[] {
  if (lineage.length === 0) {
    return ["- No parent experiment chain for this candidate."];
  }
  const depth = lineage.length + 1;
  const ancestorLines = lineage.map((ancestor, index) => {
    const commitSuffix = ancestor.candidateCommit ? ` @ ${ancestor.candidateCommit}` : "";
    return `  ${index + 1}. ${ancestor.experimentId} (${ancestor.status}) — ${ancestor.title}${commitSuffix}`;
  });
  return [
    `- This candidate sits ${depth} deep in its exploit chain (this experiment + ${lineage.length} ancestor${lineage.length === 1 ? "" : "s"}, newest first):`,
    ...ancestorLines,
  ];
}

export function searchBalanceSignalLines({
  tasks,
}: {
  tasks: (typeof researchTasks.$inferSelect)[];
}): string[] {
  if (tasks.length === 0) {
    return ["- No ResearchTasks recorded yet for this project."];
  }
  const sorted = [...tasks].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return b.id.localeCompare(a.id);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
  const recent = sorted.slice(0, SEARCH_BALANCE_SIGNAL_WINDOW);
  const tally = recent.reduce<Record<string, number>>((acc, task) => {
    acc[task.type] = (acc[task.type] ?? 0) + 1;
    return acc;
  }, {});
  const tallyEntries = Object.entries(tally)
    .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
    .map(([type, count]) => `${type}=${count}`)
    .join(", ");
  const indexOfLastExplore = sorted.findIndex((task) => task.type === "explore");
  const tasksSinceLastExplore = indexOfLastExplore === -1 ? sorted.length : indexOfLastExplore;
  const exploreLine =
    indexOfLastExplore === -1
      ? `- No explore task has ever been recorded in this project (${sorted.length} non-explore tasks so far).`
      : `- Tasks since the last explore: ${tasksSinceLastExplore} (greedy-exploit collapse risk rises after four or five; plan an explore before another exploit when this climbs).`;
  return [
    `- Recent task type tally (last ${recent.length}, of ${sorted.length} total): ${tallyEntries}.`,
    exploreLine,
  ];
}
