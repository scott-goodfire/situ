import type { Repository } from "@situ/common";
import { asc, desc, eq } from "drizzle-orm";

import { getResearchRecordsContext } from "../../context";
import { baselineActivities, baselines } from "../../schema";
import {
  clampRepositoryLimit,
  createStatusRecordTransitions,
  matchesRepositorySearch,
  nowIso,
  PreconditionError,
} from "../../__shared__";
import type { ResearchRecordStatus, ResearchRecordsDb } from "../../types";

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
  db: ResearchRecordsDb;
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
  const { runSyncedWrite } = getResearchRecordsContext();
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
  const db = getResearchRecordsContext().getDb();
  const rows = await db
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
  const db = getResearchRecordsContext().getDb();
  const [row] = await db.select().from(baselines).where(eq(baselines.id, baselineId)).limit(1);
  return row;
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
    db.update(baselines).set({ status, syncVersion, updatedAt }).where(eq(baselines.id, id)).run();
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
    researchProjectId: string;
    title: string;
    summary: string;
    createdByResearchTaskId?: string;
    createdByAgentId?: string;
    payload?: Record<string, unknown>;
  }): Promise<BaselineRecord> {
    if (!researchProjectId) {
      throw new PreconditionError({
        code: "baseline_research_project_required",
        hint: "Pass researchProjectId. Auto-resolution from createdByResearchTaskId is an app-side concern; resolve the project id before calling baselineRepository.create.",
        details: {},
      });
    }
    const { runSyncedWrite } = getResearchRecordsContext();
    const baselineId = crypto.randomUUID();
    const now = nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(baselines)
          .values({
            id: baselineId,
            researchProjectId,
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
    const db = getResearchRecordsContext().getDb();
    const rows = await db
      .select()
      .from(baselines)
      .where(eq(baselines.researchProjectId, researchProjectId))
      .orderBy(desc(baselines.updatedAt), desc(baselines.id));
    return rows.find((row) => row.createdByResearchTaskId === null);
  },

  async getWithActivities({ baselineId }: { baselineId: string }): Promise<{
    baseline: BaselineRecord;
    activities: BaselineActivity[];
  }> {
    const baseline = await requireBaselineRecord({ baselineId });
    const db = getResearchRecordsContext().getDb();
    const activities = await db
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
    const db = getResearchRecordsContext().getDb();
    const rows = await db
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
    const db = getResearchRecordsContext().getDb();
    const rows = await db
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
} satisfies Repository<BaselineRecord, "baselineId">;
