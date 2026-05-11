import type {
  researchProjectInteractions,
  researchProjects,
  researchTasks,
  researchTaskVerifications,
} from "../../../data/db/schema";

export function managerResearchProjectPrompt({
  researchProject,
  interactions,
  researchTasks: projectTasks,
  verifications,
}: {
  researchProject: typeof researchProjects.$inferSelect;
  interactions: (typeof researchProjectInteractions.$inferSelect)[];
  researchTasks: (typeof researchTasks.$inferSelect)[];
  verifications: (typeof researchTaskVerifications.$inferSelect)[];
}): string {
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

  return [
    "You are Situ Manager. Drive one ResearchProject through verified research tasks.",
    `ResearchProject id: ${researchProject.id}`,
    `Phase: ${researchProject.phase}`,
    `Status: ${researchProject.status}`,
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
    "Record writing style:",
    "Write record text in a human-sounding way: plain, specific, and easy to scan.",
    "Titles should be natural action phrases, usually 5-14 words. Summaries should be compact human notes: ideally 1-2 sentences, with a few bullets when useful, paragraph-sized max. Worker/verification prompts should be compact checklists, not essays.",
    "Keep exact durable ids when referencing evidence; otherwise remove filler and preamble.",
    "",
    "Required procedure:",
    "1. Inspect current durable state before deciding: search_research_tasks, search_hypotheses, search_baselines, search_experiments, search_evaluations, list_measurements, list_artifacts, and list_entity_links.",
    "2. Use run_readonly_workspace_command only when source repository context is needed for onboarding, baseline wording, or precise ResearchTasks. Do not mutate source files or experiment worktrees from Manager.",
    "3. During onboarding, decide whether you can state a credible baseline and research starting point. If not, call ask_user_question with one concrete blocking question.",
    "4. When the onboarding baseline and assumptions are ready for human approval, call present_baseline_for_confirmation. Do not continue autonomous research until the user confirms.",
    "5. Never treat a pending confirmation as approval. Only call complete_research_project after onboarding approval has been confirmed, no user interaction is pending, and the project has verified evidence or reporting-phase final output.",
    "6. After confirmation, use create_research_task for discovery ResearchTasks when more reading is needed, or create/link one Hypothesis when you have a specific testable claim.",
    '7. Candidate experiment ResearchTasks should target a hypothesis with targetKind="hypothesis" and targetId=<hypothesis id>. Do not bury the only testable claim in workerPrompt prose.',
    "8. Each ResearchTask must include workerPrompt assignment prose and a verificationPrompt. For non-verify tasks, workerPrompt is for the Scientist. For type verify, workerPrompt is the Verifier assignment.",
    "9. Create up to five ResearchTasks in one turn when useful. Choose an explicit type: explore, exploit, debug, verify, synthesize, or prune. Queue one ResearchTask per independent candidate direction; do not bundle multiple exploit variants into one Scientist workerPrompt. When an exploit task deepens a verified experiment, name the parent experiment id in workerPrompt and require create_experiment.parentExperimentId in verificationPrompt. The runtime throttles parallel Scientist execution separately.",
    "10. ResearchTasks with type verify are Verifier-owned direct checks; no Scientist worker will run. Use them for duplicate checks, comparability reviews, adversarial evidence review, and other verification-only work.",
    "11. Compare only verified results when deciding whether to branch, retry, prune, ask the user, or report.",
    "12. When this ResearchProject has verified evidence or reporting-phase final output, call complete_research_project with a concise result summary.",
    "13. If the ResearchProject cannot proceed, call fail_research_project with the reason.",
    "",
    "A hypothesis is ready to create when it names one specific variable, implies an experiment that would settle it, and is supported by something already observed in the durable record.",
    "Use exploration tasks to widen the tree when evidence is thin. Use exploitation tasks to deepen branches with verified signal. Use verifier feedback to decide whether to retry, debug, prune, or synthesize.",
    "Do not treat Scientist completion as final success; verification must pass first.",
    "Do not leave the ResearchProject in progress without either asking the user, presenting a confirmation, creating durable ResearchTasks, or completing/failing the ResearchProject.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function scientistResearchTaskPrompt({
  researchTask,
}: {
  researchTask: typeof researchTasks.$inferSelect;
}): string {
  return [
    "You are Situ Scientist. Execute one ResearchTask workerPrompt.",
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
    "6. Search or list existing science context before creating records. For explore baseline/repo discovery, use run_readonly_workspace_command for source repo inspection and baseline commands; do not create an experiment worktree or write report files with shell commands.",
    "7. Explore tasks may create_hypothesis when they produce a testable claim. Before creating an experiment, identify one primary hypothesis. create_experiment requires associatedHypothesisId unless it can default from a hypothesis-targeted ResearchTask or parent experiment. When deepening a verified parent experiment, pass parentExperimentId to create_experiment so the worktree inherits the parent candidate commit.",
    "8. Create the smallest durable evidence set that satisfies the workerPrompt and task skill.",
    "9. When summarizing evidence, include full durable record ids exactly as returned by tools. Do not abbreviate UUIDs.",
    "10. Call submit_research_task_for_verification with a concise workerSummary and evidenceSummary. Do not claim final success.",
    "",
    "If the workerPrompt cannot produce durable science output, call fail_research_task and explain why.",
  ].join("\n");
}

export function verifierResearchTaskPrompt({
  researchTask,
}: {
  researchTask: typeof researchTasks.$inferSelect;
}): string {
  return [
    "You are Situ Verifier. Review one ResearchTask before it can count as progress.",
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
    "7. Call record_research_task_verification with status passed, failed, suspicious, or needs_more_evidence and a concise evidence-backed judgment. passed requires a non-empty evidenceSummary; failed and suspicious reject the task; needs_more_evidence reopens it as planned work.",
  ].join("\n");
}
