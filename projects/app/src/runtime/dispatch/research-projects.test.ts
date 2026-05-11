import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { ensureRuntimeContext } from "../../config/session-context";
import { getDb } from "../../data/db/client";
import {
  appEvents,
  baselineActivities,
  baselines,
  claudeAgentRuns,
  computeTargets,
  researchProjectInteractions,
  researchProjects,
  researchTaskVerifications,
  researchTasks,
  workItems,
} from "../../data/db/schema";
import { baselineRepository } from "../../data/repositories/baselines";
import { computeTargetRepository } from "../../data/repositories/compute-targets";
import { researchProjectInteractionRepository } from "../../data/repositories/research-project-interactions";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { researchTaskVerificationRepository } from "../../data/repositories/research-task-verifications";
import { researchTaskRepository } from "../../data/repositories/research-tasks";
import { createApp } from "../../server";
import {
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "../work-items";
import {
  dispatchActiveResearchProject,
  enqueueManagerResearchProjectWork,
  enqueueScientistResearchTaskWork,
  enqueueVerifierResearchTaskWork,
  dispatchPlannedResearchTask,
} from ".";

const originalEnv = {
  SITU_HOME: process.env.SITU_HOME,
  SITU_REPO_PATH: process.env.SITU_REPO_PATH,
  SITU_DB_PATH: process.env.SITU_DB_PATH,
  SITU_ANTHROPIC_KEY: process.env.SITU_ANTHROPIC_KEY,
};

let tempRoot: string;

describe("researchProject runtime flow", () => {
  beforeAll(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "situ-research-projects-"));
    const repoPath = join(tempRoot, "repo");
    const sessionHome = join(tempRoot, "situ", "sessions", "ses_research_projects");
    await mkdir(repoPath, { recursive: true });
    await mkdir(sessionHome, { recursive: true });
    process.env.SITU_HOME = join(tempRoot, "situ");
    process.env.SITU_REPO_PATH = repoPath;
    process.env.SITU_DB_PATH = join(sessionHome, "session.sqlite");
    process.env.SITU_ANTHROPIC_KEY = "test-key";
    await ensureRuntimeContext({ sessionId: "ses_research_projects" });
  });

  beforeEach(() => {
    resetTables();
  });

  afterAll(async () => {
    restoreEnv();
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("POST /api/research-projects creates one project and enqueues Manager work", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });
    const goal = "Explore the repo and prepare a baseline checkpoint.";

    const response = await app.request("/api/research-projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal }),
    });

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    const project = jsonRecord(payload.researchProject);
    expect(project.goal).toBe(goal);
    expect(project.phase).toBe("onboarding");
    expect(project.status).toBe("active");
    expect(payload.enqueued).toBe(true);

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, stringValue(project.id)),
    });
    expect(workItem?.purpose).toBe(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE);
    expect(workItem?.targetKind).toBe("researchProject");
  });

  test("POST /api/research-projects rejects a second active project", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });

    const firstResponse = await app.request("/api/research-projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Establish the first baseline." }),
    });
    expect(firstResponse.status).toBe(200);

    const secondResponse = await app.request("/api/research-projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Start another independent run." }),
    });

    expect(secondResponse.status).toBe(409);
    const payload = jsonRecord(await secondResponse.json());
    expect(String(payload.error)).toContain("Research is already running");
    expect((await researchProjectRepository.list()).map((item) => item.goal)).toEqual([
      "Establish the first baseline.",
    ]);
  });

  test("enqueueManagerResearchProjectWork creates one Manager run for an active project", async () => {
    const project = await researchProjectRepository.create({
      goal: "Gather enough context to present a baseline.",
    });

    const enqueued = await enqueueManagerResearchProjectWork({
      researchProjectId: project.id,
    });

    if (!enqueued) {
      throw new Error("Expected ResearchProject work to enqueue.");
    }
    const storedProject = await researchProjectRepository.require({
      researchProjectId: project.id,
    });
    expect(storedProject.status).toBe("active");

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.id, enqueued.workItemId),
    });
    expect(workItem?.purpose).toBe(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE);
    expect(workItem?.targetKind).toBe("researchProject");
    expect(workItem?.targetId).toBe(project.id);
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}"));
    expect(workPayload.researchProjectId).toBe(project.id);
    expect(workPayload.researchProjectPhase).toBe("onboarding");
    expect(stringValue(workPayload.content)).toContain(`ResearchProject id: ${project.id}`);
    expect(stringValue(workPayload.content)).toContain("ask_user_question");
    expect(stringValue(workPayload.content)).toContain("present_baseline_for_confirmation");

    const run = await getDb().query.claudeAgentRuns.findFirst({
      where: eq(claudeAgentRuns.id, enqueued.claudeAgentRunId),
    });
    expect(run?.status).toBe("queued");
    expect(run?.workItemId).toBe(enqueued.workItemId);

    await expect(
      enqueueManagerResearchProjectWork({ researchProjectId: project.id }),
    ).resolves.toBeUndefined();
  });

  test("dispatchActiveResearchProject picks up the next active project", async () => {
    const project = await researchProjectRepository.create({
      goal: "Dispatch this project through scheduler behavior.",
    });

    await dispatchActiveResearchProject();

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, project.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE);
    expect(workItem?.targetKind).toBe("researchProject");
  });

  test("answering a pending interaction re-enqueues Manager work", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });
    const project = await researchProjectRepository.create({
      goal: "Ask for missing context, then continue onboarding.",
    });
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: project.id,
      kind: "question",
      prompt: "Which baseline should define success?",
      details: "The manager is blocked on one user decision.",
    });

    expect(
      (await researchProjectRepository.require({ researchProjectId: project.id })).status,
    ).toBe("blocked_on_user");

    const response = await app.request(
      `/api/research-project-interactions/${interaction.id}/answer`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: "Use the existing test suite pass rate." }),
      },
    );

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    expect(payload.enqueued).toBe(true);
    expect(
      (await researchProjectInteractionRepository.require({ interactionId: interaction.id }))
        .response,
    ).toBe("Use the existing test suite pass rate.");
    expect(
      (await researchProjectRepository.require({ researchProjectId: project.id })).status,
    ).toBe("active");

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, project.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE);
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}"));
    expect(stringValue(workPayload.content)).toContain(
      "User response: Use the existing test suite pass rate.",
    );
  });

  test("confirming a baseline advances the project out of onboarding", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });
    const project = await researchProjectRepository.create({
      goal: "Confirm the onboarding baseline before opening the rest of the workspace.",
    });
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: project.id,
      kind: "baseline_confirmation",
      prompt: "Is this baseline ready?",
      details: "Baseline summary and proposed next steps.",
    });

    const response = await app.request(
      `/api/research-project-interactions/${interaction.id}/confirm`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: "Confirmed." }),
      },
    );

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    expect(jsonRecord(payload.researchProject).phase).toBe("search");
    expect(payload.enqueued).toBe(true);

    const storedProject = await researchProjectRepository.require({
      researchProjectId: project.id,
    });
    expect(storedProject.phase).toBe("search");
    expect(storedProject.status).toBe("active");
    expect(storedProject.baselineSummary).toBe("Baseline summary and proposed next steps.");

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, project.id),
    });
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}"));
    expect(workPayload.researchProjectPhase).toBe("search");
  });

  test("ResearchTask dispatch targets Scientist and Verifier work", async () => {
    const project = await researchProjectRepository.create({ goal: "Run a verified task." });
    const task = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Inspect task flow",
      workerPrompt: "Inspect the task flow and record evidence.",
      verificationPrompt: "Check that the evidence supports the worker summary.",
    });

    const scientistWork = await enqueueScientistResearchTaskWork({ researchTaskId: task.id });
    if (scientistWork.status !== "enqueued") {
      throw new Error("Expected Scientist work to enqueue.");
    }
    const scientistWorkItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.id, scientistWork.workItemId),
    });
    expect(scientistWorkItem?.purpose).toBe(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE);
    expect(scientistWorkItem?.targetKind).toBe("researchTask");
    expect((await researchTaskRepository.require({ researchTaskId: task.id })).status).toBe(
      "running",
    );

    await researchTaskRepository.transition({
      researchTaskId: task.id,
      status: "awaiting_verification",
      resultSummary: "Worker inspected the flow.",
    });
    const verifierWork = await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
    if (!verifierWork) {
      throw new Error("Expected Verifier work to enqueue.");
    }
    const verifierWorkItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.id, verifierWork.workItemId),
    });
    expect(verifierWorkItem?.purpose).toBe(CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE);
    expect(verifierWorkItem?.targetKind).toBe("researchTask");
    expect(jsonRecord(JSON.parse(verifierWorkItem?.payloadJson ?? "{}")).activeResearchTaskId).toBe(
      task.id,
    );
  });

  test("planned verify ResearchTasks route directly to Verifier", async () => {
    const project = await researchProjectRepository.create({
      goal: "Verify evidence without Scientist implementation.",
    });
    const task = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "verify",
      title: "Check duplicate hypothesis",
      workerPrompt: "Verify whether the proposed hypothesis duplicates existing evidence.",
      verificationPrompt: "Record a verification judgment with durable evidence references.",
    });

    await expect(
      enqueueScientistResearchTaskWork({ researchTaskId: task.id }),
    ).resolves.toMatchObject({ status: "skipped", reason: "verifier_owned_task" });

    await dispatchPlannedResearchTask();

    const storedTask = await researchTaskRepository.require({ researchTaskId: task.id });
    expect(storedTask.status).toBe("awaiting_verification");
    expect(storedTask.resultSummary).toContain("Verifier-owned ResearchTask");

    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, task.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE);
    expect(workItem?.targetKind).toBe("researchTask");
    const workPayload = jsonRecord(JSON.parse(workItem?.payloadJson ?? "{}"));
    expect(workPayload.activeResearchTaskId).toBe(task.id);
    expect(stringValue(workPayload.content)).toContain("situ-verifier-verify-task");

    const scientistWork = await getDb().query.workItems.findFirst({
      where: eq(workItems.purpose, CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE),
    });
    expect(scientistWork).toBeUndefined();
  });

  test("exploit ResearchTasks wait for verified baseline evidence", async () => {
    const project = await researchProjectRepository.create({
      goal: "Do not run candidates before a verified baseline.",
    });
    const exploitTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "exploit",
      title: "Try depth twelve",
      workerPrompt: "Run the DEPTH=12 candidate.",
      verificationPrompt: "Reject if no verified baseline exists.",
    });

    await expect(
      enqueueScientistResearchTaskWork({ researchTaskId: exploitTask.id }),
    ).resolves.toMatchObject({ status: "skipped", reason: "missing_verified_baseline" });
    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: exploitTask.id })).status).toBe(
      "planned",
    );
    const scientistWork = await getDb().query.workItems.findFirst({
      where: eq(workItems.purpose, CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE),
    });
    expect(scientistWork).toBeUndefined();

    const managerWork = await getDb().query.workItems.findFirst({
      where: eq(workItems.purpose, CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE),
    });
    expect(managerWork?.targetKind).toBe("researchProject");
    expect(managerWork?.targetId).toBe(project.id);
  });

  test("planned baseline work can run before older blocked exploit work", async () => {
    const project = await researchProjectRepository.create({
      goal: "Run the baseline before queued candidates.",
    });
    const exploitTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "exploit",
      title: "Try queued candidate",
      workerPrompt: "Run the candidate after baseline evidence exists.",
      verificationPrompt: "Reject if no verified baseline exists.",
    });
    const baselineTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Measure baseline",
      workerPrompt: "Run the unmodified baseline.",
      verificationPrompt: "Check that baseline metrics are durable.",
    });

    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: exploitTask.id })).status).toBe(
      "planned",
    );
    expect((await researchTaskRepository.require({ researchTaskId: baselineTask.id })).status).toBe(
      "running",
    );
    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, baselineTask.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE);
  });

  test("compute-blocked tasks do not stall later runnable tasks", async () => {
    const project = await researchProjectRepository.create({
      goal: "Skip blocked compute work and keep dispatching.",
    });
    const blockedTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Run missing gpu task",
      workerPrompt: "Run a command that needs a gpu pool.",
      verificationPrompt: "Check the command output.",
      payload: { compute: { pool: "gpu" } },
    });
    const runnableTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Run local task",
      workerPrompt: "Run a command without compute.",
      verificationPrompt: "Check the command output.",
    });

    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: blockedTask.id })).status).toBe(
      "planned",
    );
    expect((await researchTaskRepository.require({ researchTaskId: runnableTask.id })).status).toBe(
      "running",
    );
    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, runnableTask.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE);
    expect(computeBlockedEvents()).toEqual([
      {
        researchTaskId: blockedTask.id,
        pool: "gpu",
        reason: "compute_pool_missing",
      },
    ]);
  });

  test("busy compute tasks do not stall later runnable tasks", async () => {
    await computeTargetRepository.upsert({
      computeTargetId: "target-busy-gpu",
      pool: "gpu",
      kind: "local",
    });
    const project = await researchProjectRepository.create({
      goal: "Skip busy compute work and keep dispatching.",
    });
    const ownerTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Own gpu target",
      workerPrompt: "Hold the gpu target.",
      verificationPrompt: "Check ownership.",
    });
    await researchTaskRepository.claimPlanned({ researchTaskId: ownerTask.id });
    await computeTargetRepository.claimForPool({
      pool: "gpu",
      researchTaskId: ownerTask.id,
    });
    const blockedTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Run busy gpu task",
      workerPrompt: "Run a command that needs the busy gpu pool.",
      verificationPrompt: "Check the command output.",
      payload: { compute: { pool: "gpu" } },
    });
    const runnableTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Run local task",
      workerPrompt: "Run a command without compute.",
      verificationPrompt: "Check the command output.",
    });

    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: blockedTask.id })).status).toBe(
      "planned",
    );
    expect((await researchTaskRepository.require({ researchTaskId: runnableTask.id })).status).toBe(
      "running",
    );
    expect(computeBlockedEvents()).toEqual([
      {
        researchTaskId: blockedTask.id,
        pool: "gpu",
        reason: "compute_pool_busy",
      },
    ]);
  });

  test("exploit ResearchTasks run after verified baseline evidence exists", async () => {
    const project = await researchProjectRepository.create({
      goal: "Run candidates after a verified baseline.",
    });
    const baselineTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Measure baseline",
      workerPrompt: "Run the unmodified baseline.",
      verificationPrompt: "Check that baseline metrics are durable.",
    });
    await baselineRepository.create({
      title: "Verified baseline",
      summary: "Baseline metric is durable.",
      createdByResearchTaskId: baselineTask.id,
    });
    await verifyResearchTask({
      researchTaskId: baselineTask.id,
      verificationPrompt: baselineTask.verificationPrompt,
    });
    const exploitTask = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "exploit",
      title: "Try depth twelve",
      workerPrompt: "Run the DEPTH=12 candidate.",
      verificationPrompt: "Compare against the verified baseline.",
    });

    await dispatchPlannedResearchTask();

    expect((await researchTaskRepository.require({ researchTaskId: exploitTask.id })).status).toBe(
      "running",
    );
    const workItem = await getDb().query.workItems.findFirst({
      where: eq(workItems.targetId, exploitTask.id),
    });
    expect(workItem?.purpose).toBe(CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE);
  });

  test("Replicache pull exposes ResearchProject collections", async () => {
    const app = createApp({ mode: { kind: "prod", webRoot: tempRoot } });
    const project = await researchProjectRepository.create({
      goal: "Expose this project in the client read model.",
    });
    const interaction = await researchProjectInteractionRepository.create({
      researchProjectId: project.id,
      kind: "question",
      prompt: "Which baseline should be shown?",
      details: "Needed for user approval.",
    });
    const task = await researchTaskRepository.create({
      researchProjectId: project.id,
      type: "explore",
      title: "Replicache task",
      workerPrompt: "Show this task in Replicache.",
      verificationPrompt: "Verify the task syncs.",
    });

    const response = await app.request("/api/replicache/pull", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pullVersion: 1, cookie: 0 }),
    });

    expect(response.status).toBe(200);
    const payload = jsonRecord(await response.json());
    const patch = patchOperations(payload.patch);
    const projectPut = putOperation({
      patch,
      key: `researchProjects/${project.id}`,
    });
    const projectValue = jsonRecord(projectPut.value);
    expect(projectValue.goal).toBe("Expose this project in the client read model.");
    expect(projectValue.payload).toEqual({});
    expect(projectValue).not.toHaveProperty("payloadJson");
    expect(projectValue).not.toHaveProperty("syncVersion");
    expect(projectValue).not.toHaveProperty("syncDeleted");

    const interactionPut = putOperation({
      patch,
      key: `researchProjectInteractions/${interaction.id}`,
    });
    const interactionValue = jsonRecord(interactionPut.value);
    expect(interactionValue.researchProjectId).toBe(project.id);
    expect(interactionValue.prompt).toBe("Which baseline should be shown?");

    const taskPut = putOperation({
      patch,
      key: `researchTasks/${task.id}`,
    });
    const taskValue = jsonRecord(taskPut.value);
    expect(taskValue.researchProjectId).toBe(project.id);
    expect(taskValue.payload).toEqual({});
    expect(taskValue).not.toHaveProperty("payloadJson");
  });
});

type PatchOperationValue = {
  op: string;
  key?: string;
  value?: unknown;
};

function resetTables(): void {
  const db = getDb();
  db.delete(appEvents).run();
  db.delete(claudeAgentRuns).run();
  db.delete(workItems).run();
  db.delete(computeTargets).run();
  db.delete(researchTaskVerifications).run();
  db.delete(baselineActivities).run();
  db.delete(baselines).run();
  db.delete(researchTasks).run();
  db.delete(researchProjectInteractions).run();
  db.delete(researchProjects).run();
}

function computeBlockedEvents(): Array<{
  researchTaskId: string;
  pool: string;
  reason: string;
}> {
  return getDb()
    .select()
    .from(appEvents)
    .where(eq(appEvents.type, "research_task.compute_blocked"))
    .all()
    .map((event) => {
      const payload = jsonRecord(JSON.parse(event.payloadJson));
      return {
        researchTaskId: stringValue(payload.researchTaskId),
        pool: stringValue(payload.pool),
        reason: stringValue(payload.reason),
      };
    });
}

async function verifyResearchTask({
  researchTaskId,
  verificationPrompt,
}: {
  researchTaskId: string;
  verificationPrompt: string;
}): Promise<void> {
  await researchTaskRepository.claimPlanned({ researchTaskId });
  await researchTaskRepository.transition({
    researchTaskId,
    status: "awaiting_verification",
    resultSummary: "Worker produced durable baseline evidence.",
  });
  await researchTaskVerificationRepository.create({
    researchTaskId,
    status: "passed",
    verifierPrompt: verificationPrompt,
    judgment: "Baseline evidence passed verification.",
    evidenceSummary: "Baseline record and metric output are durable.",
  });
}

function restoreEnv(): void {
  setEnv("SITU_HOME", originalEnv.SITU_HOME);
  setEnv("SITU_REPO_PATH", originalEnv.SITU_REPO_PATH);
  setEnv("SITU_DB_PATH", originalEnv.SITU_DB_PATH);
  setEnv("SITU_ANTHROPIC_KEY", originalEnv.SITU_ANTHROPIC_KEY);
}

function setEnv(key: keyof typeof originalEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function patchOperations(value: unknown): PatchOperationValue[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected Replicache patch array.");
  }
  return value.map((item) => jsonRecord(item) as PatchOperationValue);
}

function putOperation({
  patch,
  key,
}: {
  patch: PatchOperationValue[];
  key: string;
}): PatchOperationValue {
  const operation = patch.find((item) => item.op === "put" && item.key === key);
  if (!operation) {
    throw new Error(`Missing Replicache put operation for key: ${key}`);
  }
  return operation;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected object value.");
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Expected string value.");
  }
  return value;
}
