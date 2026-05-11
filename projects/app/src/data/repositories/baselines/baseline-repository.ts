import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "../../db/client";
import { baselineActivities, baselines, researchProjects } from "../../db/schema";
import { runSyncedWrite, type SyncWriteDb } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { textModule } from "../../../modules/text";
import {
  clampRepositoryLimit,
  createStatusRecordTransitions,
  matchesRepositorySearch,
  PreconditionError,
  type ResearchRecordStatus,
} from "../__shared__";
import { researchProjectRepository } from "../research-projects";
import { researchTaskRepository } from "../research-tasks";

type BaselineRecord = typeof baselines.$inferSelect;
type BaselineActivity = typeof baselineActivities.$inferSelect;

type BaselineActivityInput = {
  baselineId: string;
  actor: string;
  kind: string;
  body: string;
  payload: Record<string, unknown>;
  actorAgentId?: string;
};

function insertBaselineActivity({
  db,
  syncVersion,
  ...input
}: BaselineActivityInput & {
  db: SyncWriteDb;
  syncVersion: number;
}): void {
  db.insert(baselineActivities)
    .values({
      baselineId: input.baselineId,
      actorAgentId: input.actorAgentId,
      actor: input.actor,
      kind: input.kind,
      body: input.body,
      payloadJson: JSON.stringify(input.payload),
      syncVersion,
      syncDeleted: false,
    })
    .run();
}

async function addBaselineActivity(input: BaselineActivityInput): Promise<BaselineActivity> {
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      insertBaselineActivity({ db, ...input, syncVersion });
    },
  });
  return requireLatestBaselineActivity({ baselineId: input.baselineId });
}

async function requireLatestBaselineActivity({
  baselineId,
}: {
  baselineId: string;
}): Promise<BaselineActivity> {
  const rows = await getDb()
    .select()
    .from(baselineActivities)
    .where(eq(baselineActivities.baselineId, baselineId))
    .orderBy(asc(baselineActivities.createdAt), asc(baselineActivities.id));
  const activity = rows.at(-1);
  if (!activity) {
    throw new PreconditionError({
      code: "baseline_activity_not_persisted",
      hint: "Baseline activity write did not produce a row; this is an internal invariant violation, retry or report.",
      details: { baselineId },
    });
  }
  return activity;
}

async function getBaselineRecord({
  baselineId,
}: {
  baselineId: string;
}): Promise<BaselineRecord | undefined> {
  return getDb().query.baselines.findFirst({
    where: eq(baselines.id, baselineId),
  });
}

async function requireBaselineRecord({
  baselineId,
}: {
  baselineId: string;
}): Promise<BaselineRecord> {
  const baseline = await getBaselineRecord({ baselineId });
  if (!baseline) {
    throw new PreconditionError({
      code: "baseline_not_found",
      hint: "List or search baselines; this id may be abbreviated or stale.",
      details: { baselineId },
    });
  }
  return baseline;
}

const transitions = createStatusRecordTransitions<"baselineId", BaselineRecord>({
  idKey: "baselineId",
  defaultActor: "agent",
  recordLabel: "Baseline",
  updateStatus: ({ db, id, status, syncVersion, updatedAt }) => {
    db.update(baselines)
      .set({
        status,
        syncVersion,
        updatedAt,
      })
      .where(eq(baselines.id, id))
      .run();
  },
  insertActivity: ({ db, id, actor, actorAgentId, kind, body, payload, syncVersion }) => {
    insertBaselineActivity({
      db,
      baselineId: id,
      actor,
      actorAgentId,
      kind,
      body,
      payload,
      syncVersion,
    });
  },
  requireRecord: async ({ id }) => {
    return requireBaselineRecord({ baselineId: id });
  },
});

export const baselineRepository = {
  async create({
    researchProjectId,
    title,
    summary,
    createdByResearchTaskId,
    createdByAgentId,
    payload = {},
  }: {
    researchProjectId?: string;
    title: string;
    summary: string;
    createdByResearchTaskId?: string;
    createdByAgentId?: string;
    payload?: Record<string, unknown>;
  }): Promise<BaselineRecord> {
    const resolvedResearchProjectId = await resolveResearchProjectId({
      researchProjectId,
      createdByResearchTaskId,
    });
    const baselineId = crypto.randomUUID();
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(baselines)
          .values({
            id: baselineId,
            researchProjectId: resolvedResearchProjectId,
            title,
            summary,
            createdByResearchTaskId,
            createdByAgentId,
            status: "active",
            payloadJson: JSON.stringify(payload),
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        insertBaselineActivity({
          db,
          baselineId,
          actor: "agent",
          actorAgentId: createdByAgentId,
          kind: "recorded",
          body: summary,
          payload: { activityType: "baseline_created" },
          syncVersion,
        });
      },
    });
    return requireBaselineRecord({ baselineId });
  },

  async createOrUpdateProjectBaseline({
    researchProjectId,
    title,
    summary,
    createdByAgentId,
    payload = {},
  }: {
    researchProjectId: string;
    title: string;
    summary: string;
    createdByAgentId?: string;
    payload?: Record<string, unknown>;
  }): Promise<BaselineRecord> {
    await researchProjectRepository.require({ researchProjectId });
    const current = await baselineRepository.findProjectBaseline({ researchProjectId });
    const normalizedTitle = textModule.requiredText({ value: title, label: "title" });
    const normalizedSummary = textModule.requiredText({ value: summary, label: "summary" });
    const now = dateTimeModule.nowIso();
    if (!current) {
      const baselineId = crypto.randomUUID();
      runSyncedWrite({
        write: ({ db, syncVersion }) => {
          db.insert(baselines)
            .values({
              id: baselineId,
              researchProjectId,
              title: normalizedTitle,
              summary: normalizedSummary,
              createdByAgentId,
              status: "active",
              payloadJson: JSON.stringify(payload),
              syncVersion,
              syncDeleted: false,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          insertBaselineActivity({
            db,
            baselineId,
            actor: "manager",
            actorAgentId: createdByAgentId,
            kind: "recorded",
            body: normalizedSummary,
            payload: { activityType: "project_baseline_created" },
            syncVersion,
          });
          db.update(researchProjects)
            .set({
              phase: "baseline",
              baselineSummary: normalizedSummary,
              syncVersion,
              updatedAt: now,
            })
            .where(eq(researchProjects.id, researchProjectId))
            .run();
        },
      });
      return requireBaselineRecord({ baselineId });
    }

    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(baselines)
          .set({
            title: normalizedTitle,
            summary: normalizedSummary,
            status: "active",
            payloadJson: JSON.stringify(payload),
            syncVersion,
            updatedAt: now,
          })
          .where(eq(baselines.id, current.id))
          .run();
        insertBaselineActivity({
          db,
          baselineId: current.id,
          actor: "manager",
          actorAgentId: createdByAgentId,
          kind: "comment",
          body: normalizedSummary,
          payload: { activityType: "project_baseline_revised" },
          syncVersion,
        });
        db.update(researchProjects)
          .set({
            phase: "baseline",
            baselineSummary: normalizedSummary,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(researchProjects.id, researchProjectId))
          .run();
      },
    });
    return requireBaselineRecord({ baselineId: current.id });
  },

  async get({ baselineId }: { baselineId: string }): Promise<BaselineRecord | undefined> {
    return getBaselineRecord({ baselineId });
  },

  async require({ baselineId }: { baselineId: string }): Promise<BaselineRecord> {
    return requireBaselineRecord({ baselineId });
  },

  async findProjectBaseline({
    researchProjectId,
  }: {
    researchProjectId: string;
  }): Promise<BaselineRecord | undefined> {
    return getDb().query.baselines.findFirst({
      where: and(
        eq(baselines.researchProjectId, researchProjectId),
        isNull(baselines.createdByResearchTaskId),
      ),
      orderBy: [desc(baselines.updatedAt), desc(baselines.id)],
    });
  },

  async getWithActivities({ baselineId }: { baselineId: string }): Promise<{
    baseline: BaselineRecord;
    activities: BaselineActivity[];
  }> {
    const baseline = await requireBaselineRecord({ baselineId });
    const activities = await getDb()
      .select()
      .from(baselineActivities)
      .where(eq(baselineActivities.baselineId, baselineId))
      .orderBy(asc(baselineActivities.createdAt), asc(baselineActivities.id));
    return { baseline, activities };
  },

  async list({
    limit = 10,
  }: {
    limit?: number;
  } = {}): Promise<BaselineRecord[]> {
    const rows = await getDb()
      .select()
      .from(baselines)
      .orderBy(desc(baselines.createdAt), desc(baselines.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search({
    query,
    status,
    limit = 10,
  }: {
    query?: string;
    status?: ResearchRecordStatus;
    limit?: number;
  } = {}): Promise<BaselineRecord[]> {
    const rows = await getDb()
      .select()
      .from(baselines)
      .where(status ? eq(baselines.status, status) : undefined)
      .orderBy(desc(baselines.createdAt), desc(baselines.id));
    return rows
      .filter((baseline) =>
        matchesRepositorySearch({
          query,
          values: [
            baseline.id,
            baseline.title,
            baseline.summary,
            baseline.status,
            baseline.researchProjectId,
            baseline.createdByResearchTaskId,
            baseline.createdByAgentId,
            baseline.payloadJson,
          ],
        }),
      )
      .slice(0, clampRepositoryLimit({ limit }));
  },

  async addComment({
    baselineId,
    body,
    actor = "scientist",
    actorAgentId,
  }: {
    baselineId: string;
    body: string;
    actor?: string;
    actorAgentId?: string;
  }): Promise<BaselineActivity> {
    return addBaselineActivity({
      baselineId,
      actor,
      actorAgentId,
      kind: "comment",
      body,
      payload: {},
    });
  },

  accept: transitions.accept,
  submit: transitions.submit,
  complete: transitions.complete,
  cancel: transitions.cancel,
  fail: transitions.fail,
};

async function resolveResearchProjectId({
  researchProjectId,
  createdByResearchTaskId,
}: {
  researchProjectId?: string;
  createdByResearchTaskId?: string;
}): Promise<string> {
  if (researchProjectId) {
    await researchProjectRepository.require({ researchProjectId });
    return researchProjectId;
  }
  if (createdByResearchTaskId) {
    const task = await researchTaskRepository.require({ researchTaskId: createdByResearchTaskId });
    return task.researchProjectId;
  }
  throw new PreconditionError({
    code: "baseline_research_project_required",
    hint: "Pass researchProjectId, or pass createdByResearchTaskId so the project can be inferred from the task.",
    details: {},
  });
}
