import { and, asc, eq, inArray } from "drizzle-orm";

import {
  enqueueClaudeAgentWork,
  managerResearchProjectPrompt,
  scientistResearchTaskPrompt,
  verifierResearchTaskPrompt,
} from "../../claude/agents/runs";
import { getDb } from "../../data/db/client";
import {
  researchProjectInteractions,
  researchProjects,
  researchTaskVerifications,
  researchTasks,
  workItems,
} from "../../data/db/schema";
import { researchProjectRepository } from "../../data/repositories/research-projects";
import { researchTaskRepository } from "../../data/repositories/research-tasks";
import { hasAnthropicKey } from "../../secrets/local-secret-store";
import { claimComputeForResearchTask } from "../compute";
import {
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "../work-items";

type ResearchTaskWorkItemPurpose =
  | typeof CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE
  | typeof CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE;

export async function dispatchActiveResearchProject(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }
  const project = await getDb().query.researchProjects.findFirst({
    where: eq(researchProjects.status, "active"),
    orderBy: [asc(researchProjects.createdAt), asc(researchProjects.id)],
  });
  if (!project) {
    return;
  }
  if (await hasOpenResearchTaskWork({ researchProjectId: project.id })) {
    return;
  }
  await enqueueManagerResearchProjectWork({ researchProjectId: project.id });
}

export async function enqueueManagerResearchProjectWork({
  researchProjectId,
}: {
  researchProjectId: string;
}): Promise<{ workItemId: string; claudeAgentRunId: string } | undefined> {
  const db = getDb();
  const project = await researchProjectRepository.require({ researchProjectId });
  if (project.status !== "active") {
    return undefined;
  }
  if (await hasOpenResearchTaskWork({ researchProjectId: project.id })) {
    return undefined;
  }

  const openWork = await db.query.workItems.findFirst({
    where: and(
      eq(workItems.purpose, CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE),
      eq(workItems.targetKind, "researchProject"),
      eq(workItems.targetId, project.id),
      inArray(workItems.status, ["pending", "claimed"]),
    ),
  });
  if (openWork) {
    return undefined;
  }

  const interactions = await db
    .select()
    .from(researchProjectInteractions)
    .where(eq(researchProjectInteractions.researchProjectId, project.id))
    .orderBy(asc(researchProjectInteractions.createdAt), asc(researchProjectInteractions.id));
  const projectTasks = await researchTaskRepository.listByResearchProject({
    researchProjectId: project.id,
    limit: 100,
  });
  const taskIds = projectTasks.map((task) => task.id);
  const verifications = taskIds.length
    ? await db
        .select()
        .from(researchTaskVerifications)
        .where(inArray(researchTaskVerifications.researchTaskId, taskIds))
        .orderBy(asc(researchTaskVerifications.createdAt), asc(researchTaskVerifications.id))
    : [];

  return enqueueClaudeAgentWork({
    purpose: CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
    targetKind: "researchProject",
    targetId: project.id,
    content: managerResearchProjectPrompt({
      researchProject: project,
      interactions,
      researchTasks: projectTasks,
      verifications,
    }),
    payload: {
      researchProjectId: project.id,
      researchProjectPhase: project.phase,
    },
  });
}

async function hasOpenResearchTaskWork({
  researchProjectId,
}: {
  researchProjectId: string;
}): Promise<boolean> {
  const openTask = await getDb().query.researchTasks.findFirst({
    where: and(
      eq(researchTasks.researchProjectId, researchProjectId),
      inArray(researchTasks.status, ["planned", "running", "awaiting_verification"]),
    ),
  });
  return openTask !== undefined;
}

export async function dispatchPlannedResearchTask(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }
  const task = await getDb().query.researchTasks.findFirst({
    where: eq(researchTasks.status, "planned"),
    orderBy: [asc(researchTasks.createdAt), asc(researchTasks.id)],
  });
  if (!task) {
    return;
  }
  if (task.type === "verify") {
    await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
    return;
  }
  await enqueueScientistResearchTaskWork({ researchTaskId: task.id });
}

export async function enqueueScientistResearchTaskWork({
  researchTaskId,
}: {
  researchTaskId: string;
}): Promise<{ workItemId: string; claudeAgentRunId: string } | undefined> {
  const task = await researchTaskRepository.require({ researchTaskId });
  if (task.status !== "planned") {
    return undefined;
  }
  if (task.type === "verify") {
    return undefined;
  }
  if (
    await hasOpenResearchTaskAgentWork({
      purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      researchTaskId: task.id,
    })
  ) {
    return undefined;
  }
  const computeClaim = await claimComputeForResearchTask({ researchTask: task });
  if (computeClaim.required && !computeClaim.target) {
    return undefined;
  }
  const claimedTask = await researchTaskRepository.claimPlanned({ researchTaskId: task.id });
  return enqueueClaudeAgentWork({
    purpose: CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
    targetKind: "researchTask",
    targetId: claimedTask.id,
    content: scientistResearchTaskPrompt({ researchTask: claimedTask }),
    payload: {
      activeResearchTaskId: claimedTask.id,
      researchProjectId: claimedTask.researchProjectId,
      computeTargetId: computeClaim.target?.id,
    },
  });
}

export async function dispatchAwaitingResearchTaskVerification(): Promise<void> {
  if (!(await hasAnthropicKey())) {
    return;
  }
  const task = await getDb().query.researchTasks.findFirst({
    where: eq(researchTasks.status, "awaiting_verification"),
    orderBy: [asc(researchTasks.updatedAt), asc(researchTasks.id)],
  });
  if (!task) {
    return;
  }
  await enqueueVerifierResearchTaskWork({ researchTaskId: task.id });
}

export async function enqueueVerifierResearchTaskWork({
  researchTaskId,
}: {
  researchTaskId: string;
}): Promise<{ workItemId: string; claudeAgentRunId: string } | undefined> {
  const task = await researchTaskRepository.require({ researchTaskId });
  if (!isVerifierRoutableTask({ task })) {
    return undefined;
  }
  if (
    await hasOpenResearchTaskAgentWork({
      purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
      researchTaskId: task.id,
    })
  ) {
    return undefined;
  }
  const verifierTask =
    task.status === "planned"
      ? await preparePlannedVerifyTaskForVerifier({ researchTaskId: task.id })
      : task;
  return enqueueClaudeAgentWork({
    purpose: CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
    targetKind: "researchTask",
    targetId: verifierTask.id,
    content: verifierResearchTaskPrompt({ researchTask: verifierTask }),
    payload: {
      activeResearchTaskId: verifierTask.id,
      researchProjectId: verifierTask.researchProjectId,
    },
  });
}

async function hasOpenResearchTaskAgentWork({
  purpose,
  researchTaskId,
}: {
  purpose: ResearchTaskWorkItemPurpose;
  researchTaskId: string;
}): Promise<boolean> {
  const openWork = await getDb().query.workItems.findFirst({
    where: and(
      eq(workItems.purpose, purpose),
      eq(workItems.targetKind, "researchTask"),
      eq(workItems.targetId, researchTaskId),
      inArray(workItems.status, ["pending", "claimed"]),
    ),
  });
  return openWork !== undefined;
}

function isVerifierRoutableTask({
  task,
}: {
  task: Awaited<ReturnType<typeof researchTaskRepository.require>>;
}): boolean {
  return (
    task.status === "awaiting_verification" || (task.status === "planned" && task.type === "verify")
  );
}

async function preparePlannedVerifyTaskForVerifier({
  researchTaskId,
}: {
  researchTaskId: string;
}): Promise<Awaited<ReturnType<typeof researchTaskRepository.require>>> {
  await researchTaskRepository.claimPlanned({ researchTaskId });
  return researchTaskRepository.transition({
    researchTaskId,
    status: "awaiting_verification",
    resultSummary:
      "Verifier-owned ResearchTask. Treat workerPrompt as the verification assignment and verificationPrompt as acceptance criteria.",
  });
}
