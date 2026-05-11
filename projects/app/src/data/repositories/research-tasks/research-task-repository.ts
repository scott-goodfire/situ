import { and, asc, desc, eq } from "drizzle-orm";
import {
  RESEARCH_TASK_PRIORITIES,
  RESEARCH_TASK_STATUSES,
  RESEARCH_TASK_TYPES,
} from "@situ/protocol";

import { getDb } from "../../db/client";
import { researchTasks } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { textModule } from "../../../modules/text";
import { clampRepositoryLimit, matchesRepositorySearch } from "../__shared__";
import { researchProjectRepository } from "../research-projects";

export type ResearchTaskRecord = typeof researchTasks.$inferSelect;
export type ResearchTaskType = ResearchTaskRecord["type"];
export type ResearchTaskStatus = ResearchTaskRecord["status"];
export type ResearchTaskPriority = ResearchTaskRecord["priority"];

const researchTaskTypes = new Set<ResearchTaskType>(RESEARCH_TASK_TYPES);
const researchTaskStatuses = new Set<ResearchTaskStatus>(RESEARCH_TASK_STATUSES);
const researchTaskPriorities = new Set<ResearchTaskPriority>(RESEARCH_TASK_PRIORITIES);
const terminalResearchTaskStatuses = new Set<ResearchTaskStatus>([
  "verified",
  "rejected",
  "pruned",
  "failed",
  "canceled",
]);

export const researchTaskRepository = {
  async create({
    researchProjectId,
    type,
    title,
    workerPrompt,
    verificationPrompt,
    priority = "normal",
    parentResearchTaskId,
    targetKind,
    targetId,
    payload = {},
    createdByAgentId,
  }: {
    researchProjectId: string;
    type: ResearchTaskType;
    title: string;
    workerPrompt: string;
    verificationPrompt: string;
    priority?: ResearchTaskPriority;
    parentResearchTaskId?: string;
    targetKind?: string;
    targetId?: string;
    payload?: Record<string, unknown>;
    createdByAgentId?: string;
  }): Promise<ResearchTaskRecord> {
    assertResearchTaskType({ type });
    assertResearchTaskPriority({ priority });
    await researchProjectRepository.require({ researchProjectId });
    if (parentResearchTaskId) {
      await researchTaskRepository.require({ researchTaskId: parentResearchTaskId });
    }
    if (Boolean(targetKind) !== Boolean(targetId)) {
      throw new Error("ResearchTask targetKind and targetId must be provided together.");
    }
    const now = dateTimeModule.nowIso();
    const researchTaskId = crypto.randomUUID();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(researchTasks)
          .values({
            id: researchTaskId,
            researchProjectId,
            parentResearchTaskId,
            type,
            status: "planned",
            priority,
            title: textModule.requiredText({ value: title, label: "title" }),
            workerPrompt: textModule.requiredText({ value: workerPrompt, label: "workerPrompt" }),
            verificationPrompt: textModule.requiredText({
              value: verificationPrompt,
              label: "verificationPrompt",
            }),
            targetKind,
            targetId,
            createdByAgentId,
            payloadJson: JSON.stringify(payload),
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      },
    });
    return researchTaskRepository.require({ researchTaskId });
  },

  async get({
    researchTaskId,
  }: {
    researchTaskId: string;
  }): Promise<ResearchTaskRecord | undefined> {
    return getDb().query.researchTasks.findFirst({
      where: eq(researchTasks.id, researchTaskId),
    });
  },

  async require({ researchTaskId }: { researchTaskId: string }): Promise<ResearchTaskRecord> {
    const task = await researchTaskRepository.get({ researchTaskId });
    if (!task) {
      throw new Error(`ResearchTask not found: ${researchTaskId}`);
    }
    return task;
  },

  async list({ limit = 20 }: { limit?: number } = {}): Promise<ResearchTaskRecord[]> {
    const rows = await getDb()
      .select()
      .from(researchTasks)
      .orderBy(desc(researchTasks.createdAt), desc(researchTasks.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async listByResearchProject({
    researchProjectId,
    limit = 50,
  }: {
    researchProjectId: string;
    limit?: number;
  }): Promise<ResearchTaskRecord[]> {
    const rows = await getDb()
      .select()
      .from(researchTasks)
      .where(eq(researchTasks.researchProjectId, researchProjectId))
      .orderBy(asc(researchTasks.createdAt), asc(researchTasks.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async listByStatus({
    status,
    limit = 20,
  }: {
    status: ResearchTaskStatus;
    limit?: number;
  }): Promise<ResearchTaskRecord[]> {
    assertResearchTaskStatus({ status });
    const rows = await getDb()
      .select()
      .from(researchTasks)
      .where(eq(researchTasks.status, status))
      .orderBy(asc(researchTasks.createdAt), asc(researchTasks.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search({
    query,
    status,
    type,
    limit = 20,
  }: {
    query?: string;
    status?: ResearchTaskStatus;
    type?: ResearchTaskType;
    limit?: number;
  } = {}): Promise<ResearchTaskRecord[]> {
    if (status) {
      assertResearchTaskStatus({ status });
    }
    if (type) {
      assertResearchTaskType({ type });
    }
    const rows = await researchTaskRepository.list({ limit: 200 });
    const filtered = rows.filter((task) => {
      if (status && task.status !== status) {
        return false;
      }
      if (type && task.type !== type) {
        return false;
      }
      return matchesRepositorySearch({
        query,
        values: [
          task.id,
          task.researchProjectId,
          task.type,
          task.status,
          task.title,
          task.workerPrompt,
          task.verificationPrompt,
          task.resultSummary,
          task.targetKind,
          task.targetId,
        ],
      });
    });
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },

  async claimPlanned({ researchTaskId }: { researchTaskId: string }): Promise<ResearchTaskRecord> {
    const current = await researchTaskRepository.require({ researchTaskId });
    if (current.status !== "planned") {
      return current;
    }
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(researchTasks)
          .set({
            status: "running",
            startedAt: current.startedAt ?? now,
            syncVersion,
            updatedAt: now,
          })
          .where(and(eq(researchTasks.id, researchTaskId), eq(researchTasks.status, "planned")))
          .run();
      },
    });
    return researchTaskRepository.require({ researchTaskId });
  },

  async transition({
    researchTaskId,
    status,
    resultSummary,
  }: {
    researchTaskId: string;
    status: ResearchTaskStatus;
    resultSummary?: string;
  }): Promise<ResearchTaskRecord> {
    assertResearchTaskStatus({ status });
    const current = await researchTaskRepository.require({ researchTaskId });
    assertResearchTaskNotTerminal({ researchTask: current, operation: "transition" });
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(researchTasks)
          .set({
            status,
            resultSummary: resultSummary ?? current.resultSummary,
            completedAt: terminalResearchTaskStatuses.has(status) ? now : current.completedAt,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(researchTasks.id, researchTaskId))
          .run();
      },
    });
    return researchTaskRepository.require({ researchTaskId });
  },
};

function assertResearchTaskNotTerminal({
  researchTask,
  operation,
}: {
  researchTask: ResearchTaskRecord;
  operation: string;
}): void {
  if (terminalResearchTaskStatuses.has(researchTask.status)) {
    throw new Error(
      `ResearchTask cannot ${operation} from terminal status: ${researchTask.status} (researchTaskId: ${researchTask.id})`,
    );
  }
}

function assertResearchTaskType(input: { type: string }): asserts input is {
  type: ResearchTaskType;
} {
  if (!researchTaskTypes.has(input.type as ResearchTaskType)) {
    throw new Error(`Invalid researchTask type: ${input.type}`);
  }
}

function assertResearchTaskStatus(input: { status: string }): asserts input is {
  status: ResearchTaskStatus;
} {
  if (!researchTaskStatuses.has(input.status as ResearchTaskStatus)) {
    throw new Error(`Invalid researchTask status: ${input.status}`);
  }
}

function assertResearchTaskPriority(input: { priority: string }): asserts input is {
  priority: ResearchTaskPriority;
} {
  if (!researchTaskPriorities.has(input.priority as ResearchTaskPriority)) {
    throw new Error(`Invalid researchTask priority: ${input.priority}`);
  }
}
