import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext } from "../../../config/session-context";
import { getDb } from "../../../data/db/client";
import {
  artifacts,
  hypotheses,
  hypothesisActivities,
  researchProjectInteractions,
  researchProjects,
  researchTaskVerifications,
  researchTasks,
} from "../../../data/db/schema";
import { hypothesisRepository } from "../../../data/repositories/hypotheses";
import { researchProjectInteractionRepository } from "../../../data/repositories/research-project-interactions";
import { researchProjectRepository } from "../../../data/repositories/research-projects";
import { researchTaskVerificationRepository } from "../../../data/repositories/research-task-verifications";
import { researchTaskRepository } from "../../../data/repositories/research-tasks";
import type { ClaudeAgentToolContext } from "./types";
import { completeResearchProjectTool } from "./complete-research-project";
import { createArtifactTool } from "./create-artifact";
import { createResearchTaskTool } from "./create-research-task";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("create_research_task tool", () => {
  beforeAll(async () => {
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
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("allows explore tasks without a target", async () => {
    const project = await researchProjectRepository.create({
      goal: "Explore before choosing a primary hypothesis.",
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
  });

  test("rejects exploit tasks without a hypothesis target", async () => {
    const project = await researchProjectRepository.create({
      goal: "Avoid issuing impossible exploit work.",
    });

    await expect(
      runCreateResearchTaskTool({
        researchProjectId: project.id,
        type: "exploit",
        title: "Run a candidate experiment",
        workerPrompt: "Try the candidate change.",
        verificationPrompt: "Check the candidate metrics.",
      }),
    ).rejects.toThrow("exploit ResearchTasks must target an existing hypothesis");

    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("rejects exploit tasks with a non-hypothesis target", async () => {
    const project = await researchProjectRepository.create({
      goal: "Target exploit work at hypotheses only.",
    });

    await expect(
      runCreateResearchTaskTool({
        researchProjectId: project.id,
        type: "exploit",
        title: "Run a baseline-targeted candidate",
        workerPrompt: "Try the candidate change.",
        verificationPrompt: "Check the candidate metrics.",
        targetKind: "baseline",
        targetId: "baseline-test",
      }),
    ).rejects.toThrow("exploit ResearchTasks must target an existing hypothesis");

    expect(await researchTaskRepositoryCount()).toBe(0);
  });

  test("allows exploit tasks with an existing hypothesis target", async () => {
    const project = await researchProjectRepository.create({
      goal: "Run a hypothesis-backed candidate.",
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

    const artifact = jsonRecord(jsonRecord(JSON.parse(result.content)).artifact);
    expect(artifact.body).toBe("Inline report body with evidence ids.");
    expect(stringValue(artifact.path)?.startsWith("inline/")).toBe(true);
    expect(stringValue(artifact.path)?.endsWith(".md")).toBe(true);
  });

  test("complete_research_project rejects onboarding, pending user work, and search without evidence", async () => {
    const onboardingProject = await researchProjectRepository.create({
      goal: "Do not complete onboarding early.",
    });
    await expect(
      completeResearchProjectTool.handler({
        input: { resultSummary: "Done too early." },
        context: toolContext({ targetKind: "researchProject", targetId: onboardingProject.id }),
      }),
    ).rejects.toThrow("onboarding");

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
    await expect(
      completeResearchProjectTool.handler({
        input: { resultSummary: "Done while blocked." },
        context: toolContext({ targetKind: "researchProject", targetId: pendingProject.id }),
      }),
    ).rejects.toThrow("pending user interaction");

    const searchProject = await researchProjectRepository.create({
      goal: "Do not complete search without evidence.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: searchProject.id,
      phase: "search",
    });
    await expect(
      completeResearchProjectTool.handler({
        input: { resultSummary: "No verified evidence yet." },
        context: toolContext({ targetKind: "researchProject", targetId: searchProject.id }),
      }),
    ).rejects.toThrow("verified ResearchTask evidence");
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
    expect(
      jsonRecord(jsonRecord(JSON.parse(verifiedResult.content)).researchProject),
    ).toMatchObject({
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
    expect(
      jsonRecord(jsonRecord(JSON.parse(reportingResult.content)).researchProject),
    ).toMatchObject({
      status: "complete",
      phase: "complete",
    });
  });
});

async function runCreateResearchTaskTool(
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
  db.delete(hypothesisActivities).run();
  db.delete(hypotheses).run();
  db.delete(researchProjectInteractions).run();
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
