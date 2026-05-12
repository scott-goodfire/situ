import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext, resetRuntimeContextForTests } from "../../../config/session-context";
import { getDb, resetDbForTests } from "../../../data/db/client";
import {
  artifacts,
  baselineActivities,
  baselines,
  computeTargets,
  experimentActivities,
  experiments,
  hypotheses,
  hypothesisActivities,
  researchProjectInteractions,
  researchProjects,
  researchTaskVerifications,
  researchTasks,
} from "../../../data/db/schema";
import { baselineRepository } from "../../../data/repositories/baselines";
import { computeTargetRepository } from "@situ/compute";
import { experimentRepository } from "../../../data/repositories/experiments";
import { hypothesisRepository } from "../../../data/repositories/hypotheses";
import { researchProjectInteractionRepository } from "../../../data/repositories/research-project-interactions";
import { researchProjectRepository } from "../../../data/repositories/research-projects";
import { researchTaskVerificationRepository } from "../../../data/repositories/research-task-verifications";
import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import type { ClaudeAgentToolContext } from "./types";
import { askUserQuestionTool } from "./ask-user-question";
import { completeResearchProjectTool } from "./complete-research-project";
import { createArtifactTool } from "./create-artifact";
import { createProjectBaselineTool } from "./create-project-baseline";
import { createResearchTaskTool } from "./create-research-task";
import { presentBaselineForConfirmationTool } from "./present-baseline-for-confirmation";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("create_research_task tool", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-create-research-task-tool-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_create_research_task_tool");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_create_research_task_tool" });
  });

  beforeEach(() => {
    resetTables();
  });

  afterAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("allows explore tasks without a target", async () => {
    const project = await researchProjectRepository.create({
      goal: "Explore before choosing a primary hypothesis.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const payload = await runCreateResearchTaskTool({
      researchProjectId: project.id,
      type: "explore",
      title: "Inspect the candidate space",
      workerPrompt: "Find one testable hypothesis.",
      verificationPrompt: "Check that the result records a hypothesis or evidence.",
    });

    const task = jsonRecord(payload.researchTask);
    expect(task.type).toBe("explore");
    expect(task.targetKind).toBeNull();
    expect(task.targetId).toBeNull();
    expect(JSON.parse(String(task.payloadJson))).toMatchObject({
      compute: { pool: "local" },
    });
  });

  test("does not store compute for Verifier-owned tasks", async () => {
    const project = await researchProjectRepository.create({
      goal: "Queue a direct verifier check.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const payload = await runCreateResearchTaskTool({
      researchProjectId: project.id,
      type: "verify",
      title: "Review duplicate evidence",
      workerPrompt: "Check whether two records duplicate the same evidence.",
      verificationPrompt: "Record a direct verification judgment.",
    });

    const task = jsonRecord(payload.researchTask);
    expect(task.type).toBe("verify");
    expect(JSON.parse(String(task.payloadJson))).not.toHaveProperty("compute");
  });

  test("rejects compute pools for Verifier-owned tasks", async () => {
    const project = await researchProjectRepository.create({
      goal: "Avoid compute on verifier-only work.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "verify",
      title: "Review duplicate evidence",
      workerPrompt: "Check whether two records duplicate the same evidence.",
      verificationPrompt: "Record a direct verification judgment.",
      computePool: "local",
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("invalid_input");
    expect(JSON.stringify(envelope.details ?? {})).toContain(
      "computePool applies only to Scientist-routed ResearchTasks",
    );
  });

  test("rejects ResearchTasks before the project baseline is confirmed", async () => {
    const project = await researchProjectRepository.create({
      goal: "Do not create worker tasks during setup.",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "explore",
      title: "Inspect too early",
      workerPrompt: "Inspect before baseline confirmation.",
      verificationPrompt: "Check that this should not be allowed.",
    });
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("wrong_project_phase");
    expect(String(envelope.hint)).toContain("onboarding");

    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("ask_user_question refuses headless projects without blocking", async () => {
    const project = await researchProjectRepository.create({
      goal: "Run without interactive questions.",
      payload: {
        executionMode: "headless",
        headless: true,
      },
    });

    const askResult = await askUserQuestionTool.handler({
      input: {
        researchProjectId: project.id,
        question: "Which metric should the run optimize?",
      },
      context: toolContext({ targetId: project.id }),
    });
    expect(envelopeFailure(askResult.content).code).toBe("ask_user_question_blocked_headless");

    expect((await getDb().select().from(researchProjectInteractions)).length).toBe(0);
    expect(
      (await researchProjectRepository.require({ researchProjectId: project.id })).status,
    ).toBe("active");
  });

  test("rejects exploit tasks without a hypothesis target", async () => {
    const project = await researchProjectRepository.create({
      goal: "Avoid issuing impossible exploit work.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "exploit",
      title: "Run a candidate experiment",
      workerPrompt: "Try the candidate change.",
      verificationPrompt: "Check the candidate metrics.",
    });
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("invalid_input");
    expect(JSON.stringify(envelope.details ?? {})).toContain(
      "exploit ResearchTasks must target an existing hypothesis",
    );

    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("rejects exploit tasks with a non-hypothesis target", async () => {
    const project = await researchProjectRepository.create({
      goal: "Target exploit work at hypotheses only.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "exploit",
      title: "Run a baseline-targeted candidate",
      workerPrompt: "Try the candidate change.",
      verificationPrompt: "Check the candidate metrics.",
      targetKind: "baseline",
      targetId: "baseline-test",
    });
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("invalid_input");
    expect(JSON.stringify(envelope.details ?? {})).toContain(
      "exploit ResearchTasks must target an existing hypothesis",
    );

    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("allows exploit tasks with an existing hypothesis target", async () => {
    const project = await researchProjectRepository.create({
      goal: "Run a hypothesis-backed candidate.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });
    const hypothesis = await hypothesisRepository.create({
      title: "Hypothesis-backed candidate",
      summary: "This candidate has a specific claim to test.",
    });

    const payload = await runCreateResearchTaskTool({
      researchProjectId: project.id,
      type: "exploit",
      title: "Run the hypothesis-backed candidate",
      workerPrompt: "Try the candidate change for the hypothesis.",
      verificationPrompt: "Check that the comparison cites the hypothesis.",
      targetKind: "hypothesis",
      targetId: hypothesis.id,
    });

    const task = jsonRecord(payload.researchTask);
    expect(task.type).toBe("exploit");
    expect(task.targetKind).toBe("hypothesis");
    expect(task.targetId).toBe(hypothesis.id);
    expect(JSON.parse(String(task.payloadJson))).toMatchObject({
      compute: { pool: "local" },
    });
  });

  test("rejects unknown compute pools before creating a task", async () => {
    const project = await researchProjectRepository.create({
      goal: "Avoid silently blocked compute work.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "explore",
      title: "Run GPU diagnostics",
      workerPrompt: "Use the GPU worker.",
      verificationPrompt: "Check GPU output.",
      computePool: "gpu",
    });
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("compute_pool_unknown");
    expect(String(envelope.hint)).toContain('computePool "gpu" is not registered');

    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("rejects explore tasks whose workerPrompt names exploit-shape tool calls", async () => {
    const project = await researchProjectRepository.create({
      goal: "Catch wrong-type filings before downstream Scientist rejection.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "explore",
      title: "Test the candidate change",
      workerPrompt:
        "Apply the helper change and call capture_experiment_candidate, then record_experiment_comparison.",
      verificationPrompt: "Check that the candidate beats baseline.",
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("read_only_task_prompt_has_exploit_shape");
    expect(String(envelope.hint)).toContain("exploit");
    const details = jsonRecord(envelope.details);
    expect(details.suggestedType).toBe("exploit");
    expect(details.taskType).toBe("explore");
    expect(Array.isArray(details.matchedTokens)).toBe(true);
    expect(details.matchedTokens).toContain("capture_experiment_candidate");
    expect(details.matchedTokens).toContain("record_experiment_comparison");

    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("rejects synthesize tasks whose workerPrompt names exploit-shape tool calls", async () => {
    const project = await researchProjectRepository.create({
      goal: "Catch synthesize-typed tasks that secretly require candidate work.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "synthesize",
      title: "Summarize and apply the candidate change",
      workerPrompt:
        "Compose a synthesis and call create_experiment to run a candidate variant on top of the verified branch.",
      verificationPrompt: "Confirm the report is durable.",
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("read_only_task_prompt_has_exploit_shape");
    const details = jsonRecord(envelope.details);
    expect(details.taskType).toBe("synthesize");
    expect(details.suggestedType).toBe("exploit");
    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("rejects prune tasks whose workerPrompt names exploit-shape tool calls", async () => {
    const project = await researchProjectRepository.create({
      goal: "Prune tasks must not run new candidate experiments.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "prune",
      title: "Prune the qwerty branch with a confirming run",
      workerPrompt:
        "Run capture_experiment_candidate on the qwerty branch to confirm before pruning, then git commit -am 'prune'.",
      verificationPrompt: "Confirm prune is justified.",
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("read_only_task_prompt_has_exploit_shape");
    const details = jsonRecord(envelope.details);
    expect(details.taskType).toBe("prune");
    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("rejects exploit tasks whose parentExperimentId references an experiment with no captured candidate commit", async () => {
    const project = await researchProjectRepository.create({
      goal: "Block exploit tasks that name uncaptured parents.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });
    const hypothesis = await hypothesisRepository.create({
      title: "Stacked anchor hypothesis",
      summary: "Combine first-letter anchor with extra-vocab fallback.",
    });
    const parent = await experimentRepository.create({
      title: "Parent experiment with no captured commit yet",
      summary: "Parent that has not yet finished capturing its candidate commit.",
      associatedHypothesisId: hypothesis.id,
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "exploit",
      title: "Deepen the stacked anchor lineage",
      workerPrompt: "Deepen the verified branch with one focused candidate variant.",
      verificationPrompt: "Verify the candidate inherits the parent commit.",
      targetKind: "hypothesis",
      targetId: hypothesis.id,
      parentExperimentId: parent.id,
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("parent_experiment_missing_candidate_commit");
    const details = jsonRecord(envelope.details);
    expect(details.parentExperimentId).toBe(parent.id);
    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("allows exploit tasks whose parentExperimentId references an experiment with a captured candidate commit and persists the field on the task payload", async () => {
    const project = await researchProjectRepository.create({
      goal: "Accept exploit tasks whose parents have captured commits.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });
    const hypothesis = await hypothesisRepository.create({
      title: "Captured-parent hypothesis",
      summary: "The parent experiment already captured a candidate commit.",
    });
    const parent = await experimentRepository.create({
      title: "Parent experiment with a captured commit",
      summary: "Parent that already has its candidate commit captured.",
      associatedHypothesisId: hypothesis.id,
      candidateCommit: "f6fed76",
    });

    const payload = await runCreateResearchTaskTool({
      researchProjectId: project.id,
      type: "exploit",
      title: "Deepen the captured-parent lineage",
      workerPrompt: "Deepen the verified branch with one focused candidate variant.",
      verificationPrompt: "Verify the candidate inherits the parent commit.",
      targetKind: "hypothesis",
      targetId: hypothesis.id,
      parentExperimentId: parent.id,
    });
    const task = jsonRecord(payload.researchTask);
    expect(task.type).toBe("exploit");
    expect(JSON.parse(String(task.payloadJson))).toMatchObject({
      parentExperimentId: parent.id,
    });
  });

  test("rejects exploit tasks whose parentExperimentId references an unknown experiment", async () => {
    const project = await researchProjectRepository.create({
      goal: "Catch typo'd or stale parentExperimentId references.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });
    const hypothesis = await hypothesisRepository.create({
      title: "Some hypothesis",
      summary: "Anything testable.",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "exploit",
      title: "Deepen a phantom parent",
      workerPrompt: "Deepen the verified branch with one focused candidate variant.",
      verificationPrompt: "Verify the candidate inherits the parent commit.",
      targetKind: "hypothesis",
      targetId: hypothesis.id,
      parentExperimentId: "00000000-0000-4000-8000-000000000000",
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("parent_experiment_not_found");
    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("rejects parentExperimentId on non-deepening task types", async () => {
    const project = await researchProjectRepository.create({
      goal: "parentExperimentId is only valid on exploit/debug tasks.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const envelope = await runCreateResearchTaskToolEnvelope({
      researchProjectId: project.id,
      type: "explore",
      title: "Explore the search space",
      workerPrompt: "Read the dev miss categories and propose hypotheses.",
      verificationPrompt: "Check that hypothesis claims cite dev evidence.",
      parentExperimentId: "00000000-0000-4000-8000-000000000000",
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.code).toBe("invalid_input");
  });

  test("allows explore tasks whose workerPrompt is purely diagnostic", async () => {
    const project = await researchProjectRepository.create({
      goal: "Allow legitimate explore work that names tools in prose.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });

    const payload = await runCreateResearchTaskTool({
      researchProjectId: project.id,
      type: "explore",
      title: "Read recent git commits for context",
      workerPrompt:
        "Inspect the last 20 commits in main using git log and summarize what changed in the training loop.",
      verificationPrompt: "Check that the summary cites at least three commit hashes.",
    });

    const task = jsonRecord(payload.researchTask);
    expect(task.type).toBe("explore");
  });

  test("stores a registered compute pool on the task payload", async () => {
    const project = await researchProjectRepository.create({
      goal: "Route work to a registered compute pool.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });
    await computeTargetRepository.upsert({
      pool: "gpu",
      kind: "local",
      label: "gpu0",
    });

    const payload = await runCreateResearchTaskTool({
      researchProjectId: project.id,
      type: "explore",
      title: "Run GPU diagnostics",
      workerPrompt: "Use the GPU worker.",
      verificationPrompt: "Check GPU output.",
      computePool: "gpu",
    });

    const task = jsonRecord(payload.researchTask);
    expect(JSON.parse(String(task.payloadJson))).toMatchObject({
      compute: { pool: "gpu" },
    });
  });

  test("create_project_baseline creates and revises Manager-owned setup baselines", async () => {
    const project = await researchProjectRepository.create({
      goal: "Prepare a setup baseline.",
    });

    const first = await createProjectBaselineTool.handler({
      input: {
        researchProjectId: project.id,
        title: "Native test suite baseline",
        summary: "Use the native test suite pass rate as the setup baseline.",
        metric: "pass rate",
        command: "bun test",
      },
      context: toolContext({ targetId: project.id }),
    });
    const firstBaseline = jsonRecord(envelopeData(first.content).baseline);
    expect(firstBaseline.researchProjectId).toBe(project.id);
    expect(firstBaseline.createdByResearchTaskId).toBeNull();
    expect(jsonRecord(JSON.parse(String(firstBaseline.payloadJson))).metric).toBe("pass rate");
    expect((await researchProjectRepository.require({ researchProjectId: project.id })).phase).toBe(
      "baseline",
    );

    const revised = await createProjectBaselineTool.handler({
      input: {
        researchProjectId: project.id,
        title: "Revised baseline",
        summary: "Use the revised baseline.",
        assumptions: ["The user corrected the metric."],
      },
      context: toolContext({ targetId: project.id }),
    });
    const revisedBaseline = jsonRecord(envelopeData(revised.content).baseline);
    expect(revisedBaseline.id).toBe(firstBaseline.id);
    expect(revisedBaseline.title).toBe("Revised baseline");
    expect((await getDb().select().from(baselines)).length).toBe(1);
    expect(
      (await researchProjectRepository.require({ researchProjectId: project.id })).baselineSummary,
    ).toBe("Use the revised baseline.");
  });

  test("present_baseline_for_confirmation requires a project baseline id", async () => {
    const project = await researchProjectRepository.create({
      goal: "Confirm setup baseline.",
    });
    const baseline = await baselineRepository.createOrUpdateProjectBaseline({
      researchProjectId: project.id,
      title: "Setup baseline",
      summary: "Baseline shown to the user.",
    });

    const result = await presentBaselineForConfirmationTool.handler({
      input: {
        researchProjectId: project.id,
        prompt: "Does this baseline look right?",
        baselineId: baseline.id,
      },
      context: toolContext({ targetId: project.id }),
    });

    const interaction = jsonRecord(envelopeData(result.content).interaction);
    expect(interaction.kind).toBe("baseline_confirmation");
    expect(interaction.details).toBe("Baseline shown to the user.");
    expect(jsonRecord(JSON.parse(String(interaction.payloadJson))).baselineId).toBe(baseline.id);
  });

  test("create_artifact accepts body-only inline report artifacts", async () => {
    const project = await researchProjectRepository.create({
      goal: "Create an inline report artifact.",
    });
    const task = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "synthesize",
      title: "Create inline artifact target",
      workerPrompt: "Create a concise durable output.",
      verificationPrompt: "Verify the durable output.",
    });

    const result = await createArtifactTool.handler({
      input: {
        title: "Inline synthesis report",
        kind: "report",
        body: "Inline report body with evidence ids.",
        entityKind: "research_task",
        entityId: task.id,
        mediaType: "text/markdown",
      },
      context: toolContext({
        targetKind: "researchTask",
        targetId: task.id,
        activeResearchTaskId: task.id,
      }),
    });

    const artifact = jsonRecord(envelopeData(result.content).artifact);
    expect(artifact.body).toBe("Inline report body with evidence ids.");
    expect(stringValue(artifact.path)?.startsWith("inline/")).toBe(true);
    expect(stringValue(artifact.path)?.endsWith(".md")).toBe(true);
  });

  test("complete_research_project rejects onboarding, pending user work, and search without evidence", async () => {
    const onboardingProject = await researchProjectRepository.create({
      goal: "Do not complete onboarding early.",
    });
    const onboardingResult = await completeResearchProjectTool.handler({
      input: { resultSummary: "Done too early." },
      context: toolContext({ targetKind: "researchProject", targetId: onboardingProject.id }),
    });
    expect(envelopeFailure(onboardingResult.content).code).toBe("wrong_project_phase");

    const pendingProject = await researchProjectRepository.create({
      goal: "Do not complete while blocked on user.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: pendingProject.id,
      phase: "search",
    });
    await researchProjectInteractionRepository.create({
      researchProjectId: pendingProject.id,
      kind: "question",
      prompt: "Which metric should count?",
    });
    const pendingResult = await completeResearchProjectTool.handler({
      input: { resultSummary: "Done while blocked." },
      context: toolContext({ targetKind: "researchProject", targetId: pendingProject.id }),
    });
    expect(envelopeFailure(pendingResult.content).code).toBe(
      "complete_research_project_blocked_pending_interaction",
    );

    const searchProject = await researchProjectRepository.create({
      goal: "Do not complete search without evidence.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: searchProject.id,
      phase: "search",
    });
    const searchResult = await completeResearchProjectTool.handler({
      input: { resultSummary: "No verified evidence yet." },
      context: toolContext({ targetKind: "researchProject", targetId: searchProject.id }),
    });
    expect(envelopeFailure(searchResult.content).code).toBe("missing_verified_evidence");
  });

  test("complete_research_project accepts verified evidence or reporting phase final output", async () => {
    const verifiedProject = await researchProjectRepository.create({
      goal: "Complete after verified task.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: verifiedProject.id,
      phase: "search",
    });
    const verifiedTask = await researchTaskRepository.create({
      researchProjectId: verifiedProject.id,
      type: "synthesize",
      title: "Verified completion evidence",
      workerPrompt: "Create a concise durable output.",
      verificationPrompt: "Verify the durable output.",
    });
    await researchTaskRepository.claimPlanned({ researchTaskId: verifiedTask.id });
    await researchTaskRepository.transition({
      researchTaskId: verifiedTask.id,
      status: "awaiting_verification",
      resultSummary: "Evidence ready.",
    });
    await researchTaskVerificationRepository.create({
      researchTaskId: verifiedTask.id,
      status: "passed",
      verifierPrompt: "Check evidence.",
      judgment: "Evidence is sufficient.",
      evidenceSummary: "Verified ResearchTask evidence exists.",
    });
    const verifiedResult = await completeResearchProjectTool.handler({
      input: { resultSummary: "Completed from verified evidence." },
      context: toolContext({ targetKind: "researchProject", targetId: verifiedProject.id }),
    });
    expect(jsonRecord(envelopeData(verifiedResult.content).researchProject)).toMatchObject({
      status: "complete",
      phase: "complete",
    });

    const reportingProject = await researchProjectRepository.create({
      goal: "Complete final report phase.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: reportingProject.id,
      phase: "reporting",
    });
    const reportingResult = await completeResearchProjectTool.handler({
      input: { resultSummary: "Completed from reporting-phase final output." },
      context: toolContext({ targetKind: "researchProject", targetId: reportingProject.id }),
    });
    expect(jsonRecord(envelopeData(reportingResult.content).researchProject)).toMatchObject({
      status: "complete",
      phase: "complete",
    });
  });
});

async function runCreateResearchTaskTool(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const envelope = await runCreateResearchTaskToolEnvelope(input);
  if (envelope.ok !== true) {
    throw new Error(
      `create_research_task failed: ${String(envelope.code)} — ${String(envelope.hint)}`,
    );
  }
  return jsonRecord(envelope.data);
}

async function runCreateResearchTaskToolEnvelope(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await createResearchTaskTool.handler({
    input,
    context: toolContext(),
  });
  return jsonRecord(JSON.parse(result.content));
}

function toolContext({
  targetKind = "researchProject",
  targetId = "project_create_research_task_tool",
  activeResearchTaskId,
}: {
  targetKind?: string;
  targetId?: string;
  activeResearchTaskId?: string;
} = {}): ClaudeAgentToolContext {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    claudeAgentRunId: "run_create_research_task_tool",
    activeResearchTaskId,
    workItem: {
      id: "work_create_research_task_tool",
      purpose: "claude.manager_research_project",
      targetKind,
      targetId,
      status: "pending",
      ownerAgentId: null,
      ownerWorkflowId: null,
      attempt: 1,
      availableAt: now,
      claimedAt: null,
      leaseExpiresAt: null,
      completedAt: null,
      payloadJson: "{}",
      syncVersion: 1,
      syncDeleted: false,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function resetTables(): void {
  const db = getDb();
  db.delete(researchTaskVerifications).run();
  db.delete(artifacts).run();
  db.delete(baselineActivities).run();
  db.delete(baselines).run();
  db.delete(experimentActivities).run();
  db.delete(experiments).run();
  db.delete(hypothesisActivities).run();
  db.delete(hypotheses).run();
  db.delete(researchProjectInteractions).run();
  db.delete(computeTargets).run();
  db.delete(researchTasks).run();
  db.delete(researchProjects).run();
}

async function researchTaskRepositoryCount(): Promise<number> {
  return (await getDb().select().from(researchTasks)).length;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected JSON object.");
  }
  return value as Record<string, unknown>;
}

function envelopeData(content: string): Record<string, unknown> {
  const envelope = jsonRecord(JSON.parse(content));
  if (envelope.ok !== true) {
    throw new Error(`Expected ok envelope, got: ${JSON.stringify(envelope)}`);
  }
  return jsonRecord(envelope.data);
}

function envelopeFailure(content: string): { code: string; hint: string } {
  const envelope = jsonRecord(JSON.parse(content));
  if (envelope.ok !== false) {
    throw new Error(`Expected fail envelope, got: ${JSON.stringify(envelope)}`);
  }
  return {
    code: String(envelope.code),
    hint: String(envelope.hint),
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
