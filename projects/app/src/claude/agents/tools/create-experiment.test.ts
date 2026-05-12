import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { ensureRuntimeContext, resetRuntimeContextForTests } from "../../../config/session-context";
import { getDb, resetDbForTests } from "../../../data/db/client";
import {
  experimentActivities,
  experiments,
  hypotheses,
  hypothesisActivities,
  researchProjects,
  researchTasks,
} from "../../../data/db/schema";
import { experimentRepository } from "@situ/research-records";
import { hypothesisRepository } from "@situ/research-records";
import { researchProjectRepository } from "@situ/research-projects";
import { researchTaskRepository } from "@situ/research-projects";
import { createExperimentTool } from "./create-experiment";
import type { ClaudeAgentToolContext } from "./types";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
};

let tempRoot: string;

describe("create_experiment parentExperimentId inheritance", () => {
  beforeAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    tempRoot = await mkdtemp(join(tmpdir(), "situ-create-experiment-tool-"));
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_create_experiment_tool");
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = tempRoot;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    await ensureRuntimeContext({ sessionId: "ses_create_experiment_tool" });
  });

  beforeEach(() => {
    const db = getDb();
    db.delete(experimentActivities).run();
    db.delete(experiments).run();
    db.delete(hypothesisActivities).run();
    db.delete(hypotheses).run();
    db.delete(researchTasks).run();
    db.delete(researchProjects).run();
  });

  afterAll(async () => {
    resetDbForTests();
    resetRuntimeContextForTests();
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("inherits parentExperimentId from the active research task's payload", async () => {
    const { researchTask, parent, hypothesis } = await seedDeepeningTask({
      candidateCommit: "abc1234",
    });

    const envelope = await runCreateExperimentToolEnvelope(
      {
        title: "Tighten first-letter prior penalty threshold",
        summary: "Deepens the captured parent by tightening the penalty.",
        associatedHypothesisId: hypothesis.id,
      },
      researchTask.id,
    );

    expect(envelope.ok).toBe(true);
    const experiment = jsonRecord(jsonRecord(envelope.data).experiment);
    expect(experiment.parentExperimentId).toBe(parent.id);
    expect(experiment.associatedHypothesisId).toBe(hypothesis.id);
  });

  test("explicit parentExperimentId overrides the inherited value", async () => {
    const { researchTask, hypothesis } = await seedDeepeningTask({
      candidateCommit: "abc1234",
    });
    const overrideParent = await experimentRepository.create({
      title: "Override parent",
      summary: "Different parent the Scientist wants to inherit from instead.",
      associatedHypothesisId: hypothesis.id,
      candidateCommit: "def5678",
    });

    const envelope = await runCreateExperimentToolEnvelope(
      {
        title: "Pivot to a different parent",
        summary: "Scientist overrides the inherited parent.",
        associatedHypothesisId: hypothesis.id,
        parentExperimentId: overrideParent.id,
      },
      researchTask.id,
    );

    expect(envelope.ok).toBe(true);
    const experiment = jsonRecord(jsonRecord(envelope.data).experiment);
    expect(experiment.parentExperimentId).toBe(overrideParent.id);
  });

  test("leaves parentExperimentId null when neither the input nor the task payload sets it", async () => {
    const project = await researchProjectRepository.create({
      goal: "Plain exploit without a parent.",
    });
    await researchProjectRepository.updatePhase({
      researchProjectId: project.id,
      phase: "search",
    });
    const hypothesis = await hypothesisRepository.create({
      title: "Plain hypothesis",
      summary: "No parent experiment.",
    });
    const researchTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "exploit",
      title: "Try an exploit without a parent",
      workerPrompt: "Try one candidate change.",
      verificationPrompt: "Verify the change is sound.",
      targetKind: "hypothesis",
      targetId: hypothesis.id,
    });

    const envelope = await runCreateExperimentToolEnvelope(
      {
        title: "First exploit attempt with no parent",
        summary: "No inheritance possible.",
        associatedHypothesisId: hypothesis.id,
      },
      researchTask.id,
    );

    expect(envelope.ok).toBe(true);
    const experiment = jsonRecord(jsonRecord(envelope.data).experiment);
    expect(experiment.parentExperimentId).toBeNull();
  });
});

async function seedDeepeningTask({ candidateCommit }: { candidateCommit: string }): Promise<{
  researchTask: typeof researchTasks.$inferSelect;
  parent: Awaited<ReturnType<typeof experimentRepository.create>>;
  hypothesis: Awaited<ReturnType<typeof hypothesisRepository.create>>;
}> {
  const project = await researchProjectRepository.create({
    goal: "Deepen a verified parent via inherited parentExperimentId.",
  });
  await researchProjectRepository.updatePhase({
    researchProjectId: project.id,
    phase: "search",
  });
  const hypothesis = await hypothesisRepository.create({
    title: "First-letter prior",
    summary: "Penalize candidates that disagree on the first character.",
  });
  const parent = await experimentRepository.create({
    title: "Parent: first-letter prior baseline",
    summary: "Captured parent ready to deepen.",
    associatedHypothesisId: hypothesis.id,
    candidateCommit,
  });
  const researchTask = await researchTaskRepository.create({
    researchProjectId: project.id,
    type: "exploit",
    title: "Deepen first-letter prior with a tighter threshold",
    workerPrompt: "Deepen the verified branch with one focused candidate variant.",
    verificationPrompt: "Verify the candidate inherits the parent commit.",
    targetKind: "hypothesis",
    targetId: hypothesis.id,
    payload: { parentExperimentId: parent.id },
  });
  return { researchTask, parent, hypothesis };
}

async function runCreateExperimentToolEnvelope(
  input: Record<string, unknown>,
  activeResearchTaskId: string,
): Promise<Record<string, unknown>> {
  const result = await createExperimentTool.handler({
    input,
    context: toolContext({ activeResearchTaskId }),
  });
  return jsonRecord(JSON.parse(result.content));
}

function toolContext({
  activeResearchTaskId,
}: {
  activeResearchTaskId: string;
}): ClaudeAgentToolContext {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    claudeAgentRunId: "run_create_experiment_tool",
    activeResearchTaskId,
    workItem: {
      id: "work_create_experiment_tool",
      purpose: "claude.scientist_research_task",
      targetKind: "researchTask",
      targetId: activeResearchTaskId,
      status: "claimed",
      ownerAgentId: null,
      ownerWorkflowId: null,
      attempt: 1,
      availableAt: now,
      claimedAt: now,
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

function jsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected JSON object.");
  }
  return value as Record<string, unknown>;
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
