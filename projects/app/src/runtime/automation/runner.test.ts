import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import {
  claudeAgentRuns,
  baselineActivities,
  baselines,
  computeTargets,
  hypotheses,
  researchProjectInteractions,
  researchProjects,
  researchTasks,
  workItems,
} from "../../data/db/schema";
import { baselineRepository } from "@situ/research-records";
import { createOrUpdateProjectBaseline } from "../../data/repositories/baselines";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import {
  readAutomationState,
  seedSessionObjective,
  type AutomationState,
  waitForAutomationUntilIdle,
} from ".";

const originalEnv = {
  SITU_ANTHROPIC_KEY: process.env.SITU_ANTHROPIC_KEY,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
};

let tempRoot: string;

describe("automation runner", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-automation-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "state", "sessions", "ses_automation");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "state");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    process.env.SITU_ANTHROPIC_KEY = "sk-ant-test-automation";
    await ensureRuntimeContext({ sessionId: "ses_automation" });
  });

  beforeEach(() => {
    resetAutomationTables();
  });

  afterAll(async () => {
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("summarizes active, pending, running, and failed work", async () => {
    const db = getDb();
    db.insert(researchProjects)
      .values({
        id: "research_project_automation",
        goal: "Measure automation state.",
      })
      .run();
    db.insert(researchTasks)
      .values([
        researchTaskValues({ id: "research_task_active", status: "planned" }),
        researchTaskValues({ id: "research_task_failed", status: "failed" }),
      ])
      .run();
    db.insert(workItems)
      .values([
        workItemValues({ id: "work_item_pending", status: "pending" }),
        workItemValues({ id: "work_item_claimed", status: "claimed" }),
        workItemValues({ id: "work_item_failed", status: "failed" }),
      ])
      .run();
    db.insert(claudeAgentRuns)
      .values([
        {
          id: "claude_run_active",
          workItemId: "work_item_pending",
          status: "queued",
        },
        {
          id: "claude_run_failed",
          workItemId: "work_item_failed",
          status: "failed",
        },
      ])
      .run();
    db.insert(hypotheses)
      .values({
        id: "hypothesis_triage",
        title: "Untriaged hypothesis",
        summary: "A hypothesis waiting for triage.",
        status: "triage",
      })
      .run();
    db.insert(researchProjectInteractions)
      .values({
        id: "interaction_pending_question",
        researchProjectId: "research_project_automation",
        kind: "question",
        prompt: "Which metric should the run optimize?",
        status: "pending",
      })
      .run();

    const expected: AutomationState = {
      activeResearchTasks: 1,
      pendingWorkItems: 1,
      claimedWorkItems: 1,
      runningClaudeAgentRuns: 1,
      triageHypotheses: 1,
      pendingUserQuestions: 1,
      pendingBaselineConfirmations: 0,
      failedResearchTasks: 1,
      failedWorkItems: 1,
      failedClaudeAgentRuns: 1,
      computeBlockers: [
        {
          kind: "missing_pool",
          researchTaskId: "research_task_active",
          researchTaskTitle: "research_task_active",
          pool: "local",
          totalTargets: 0,
          idleTargets: 0,
          claimedTargets: 0,
          message:
            'ResearchTask research_task_active requires compute pool "local", but no active target is registered.',
        },
      ],
    };

    await expect(readAutomationState()).resolves.toEqual(expected);
  });

  test("seedSessionObjective marks headless project config and prompt", async () => {
    const { researchProject } = await seedSessionObjective({
      objective: "Run this project without interactive questions.",
      executionMode: "headless",
    });
    const storedProject = await researchProjectRepository.require({
      researchProjectId: researchProject.id,
    });
    const payload = jsonRecord(JSON.parse(storedProject.payloadJson) as unknown);
    expect(payload).toMatchObject({
      executionMode: "headless",
      headless: true,
      rootObjective: true,
    });

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, researchProject.id),
    });
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}") as unknown);
    expect(String(workPayload.content)).toContain("Execution mode: headless");
    expect(String(workPayload.content)).toContain(
      "Headless exec mode: do not call ask_user_question",
    );
  });

  test("reports blocked_on_user when only a pending interaction remains", async () => {
    const db = getDb();
    db.insert(researchProjects)
      .values({
        id: "research_project_automation",
        goal: "Measure automation blockers.",
        status: "blocked_on_user",
      })
      .run();
    db.insert(researchProjectInteractions)
      .values({
        id: "interaction_pending_question",
        researchProjectId: "research_project_automation",
        kind: "question",
        prompt: "Which metric should the run optimize?",
        status: "pending",
      })
      .run();

    await expect(
      waitForAutomationUntilIdle({
        timeoutSeconds: 1,
        pollMs: 10,
        settleMs: 10,
      }),
    ).resolves.toMatchObject({
      status: "blocked_on_user",
      state: {
        pendingUserQuestions: 1,
        pendingBaselineConfirmations: 0,
      },
      blockers: [
        {
          interactionId: "interaction_pending_question",
          researchProjectId: "research_project_automation",
          kind: "question",
          prompt: "Which metric should the run optimize?",
        },
      ],
    });
  });

  test("reports blocked_on_compute when planned work requires a missing pool", async () => {
    const db = getDb();
    db.insert(researchProjects)
      .values({
        id: "research_project_automation",
        goal: "Run GPU work.",
      })
      .run();
    db.insert(researchTasks)
      .values(
        researchTaskValues({
          id: "research_task_gpu",
          status: "planned",
          payload: { compute: { pool: "gpu" } },
        }),
      )
      .run();

    await expect(
      waitForAutomationUntilIdle({
        timeoutSeconds: 1,
        pollMs: 10,
        settleMs: 10,
      }),
    ).resolves.toMatchObject({
      status: "blocked_on_compute",
      state: {
        activeResearchTasks: 1,
        computeBlockers: [
          {
            kind: "missing_pool",
            researchTaskId: "research_task_gpu",
            pool: "gpu",
          },
        ],
      },
      computeBlockers: [
        {
          kind: "missing_pool",
          researchTaskId: "research_task_gpu",
          pool: "gpu",
        },
      ],
    });
  });

  test("can ignore triage hypotheses when a focused slice is otherwise idle", async () => {
    getDb()
      .insert(hypotheses)
      .values({
        id: "hypothesis_slice_output",
        title: "Focused slice output",
        summary: "A hypothesis created by a non-Manager slice.",
        status: "triage",
      })
      .run();

    await expect(
      waitForAutomationUntilIdle({
        timeoutSeconds: 1,
        pollMs: 10,
        settleMs: 10,
        ignoreTriageHypotheses: true,
      }),
    ).resolves.toMatchObject({
      status: "idle",
      state: {
        triageHypotheses: 1,
        pendingWorkItems: 0,
        claimedWorkItems: 0,
        runningClaudeAgentRuns: 0,
      },
    });
  });

  test("auto-confirms pending project baseline confirmations in exec mode", async () => {
    const project = await researchProjectRepository.create({
      goal: "Auto-confirm the setup baseline.",
    });
    const baseline = await createOrUpdateProjectBaseline({
      researchProjectId: project.id,
      title: "Exec setup baseline",
      summary: "Exec should auto-confirm this setup baseline.",
    });
    getDb()
      .insert(researchProjectInteractions)
      .values({
        id: "interaction_pending_baseline",
        researchProjectId: project.id,
        kind: "baseline_confirmation",
        prompt: "Does this setup baseline look right?",
        details: baseline.summary,
        status: "pending",
        payloadJson: JSON.stringify({ baselineId: baseline.id }),
      })
      .run();
    await researchProjectRepository.transition({
      researchProjectId: project.id,
      status: "blocked_on_user",
    });
    getDb()
      .insert(workItems)
      .values({
        id: "claimed_manager_work",
        purpose: "claude.manager_research_project",
        targetKind: "researchProject",
        targetId: project.id,
        status: "claimed",
        attempt: 1,
        leaseExpiresAt: "2999-01-01T00:00:00.000Z",
      })
      .run();

    await expect(
      waitForAutomationUntilIdle({
        timeoutSeconds: 1,
        pollMs: 10,
        settleMs: 10,
        autoConfirmBaselines: true,
      }),
    ).resolves.toMatchObject({ status: "timeout" });

    expect((await researchProjectRepository.require({ researchProjectId: project.id })).phase).toBe(
      "search",
    );
    expect((await baselineRepository.require({ baselineId: baseline.id })).status).toBe("accepted");
  });
});

function resetAutomationTables(): void {
  const db = getDb();
  db.delete(claudeAgentRuns).run();
  db.delete(workItems).run();
  db.delete(baselineActivities).run();
  db.delete(baselines).run();
  db.delete(computeTargets).run();
  db.delete(hypotheses).run();
  db.delete(researchProjectInteractions).run();
  db.delete(researchTasks).run();
  db.delete(researchProjects).run();
}

function researchTaskValues({
  id,
  status,
  payload = {},
}: {
  id: string;
  status: typeof researchTasks.$inferInsert.status;
  payload?: Record<string, unknown>;
}): typeof researchTasks.$inferInsert {
  return {
    id,
    researchProjectId: "research_project_automation",
    type: "explore",
    status,
    title: id,
    workerPrompt: "Inspect durable state.",
    verificationPrompt: "Verify durable state.",
    payloadJson: JSON.stringify(payload),
  };
}

function workItemValues({
  id,
  status,
}: {
  id: string;
  status: typeof workItems.$inferInsert.status;
}): typeof workItems.$inferInsert {
  return {
    id,
    purpose: id,
    targetKind: "automation-test",
    targetId: id,
    status,
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
