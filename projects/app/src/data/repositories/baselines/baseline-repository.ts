import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { baselineActivities, baselines } from "../../db/schema";
import { runSyncedWrite, type SyncWriteDb } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import {
  clampRepositoryLimit,
  createStatusRecordTransitions,
  matchesRepositorySearch,
  type ResearchRecordStatus,
} from "../__shared__";

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
    throw new Error(`Baseline activity was not persisted: ${baselineId}`);
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
    throw new Error(`Baseline not found: ${baselineId}`);
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
    title,
    summary,
    createdByResearchTaskId,
    createdByAgentId,
  }: {
    title: string;
    summary: string;
    createdByResearchTaskId?: string;
    createdByAgentId?: string;
  }): Promise<BaselineRecord> {
    const baselineId = crypto.randomUUID();
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(baselines)
          .values({
            id: baselineId,
            title,
            summary,
            createdByResearchTaskId,
            createdByAgentId,
            status: "active",
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
            baseline.createdByResearchTaskId,
            baseline.createdByAgentId,
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
