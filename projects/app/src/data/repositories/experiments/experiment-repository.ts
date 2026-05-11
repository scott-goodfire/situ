import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { experimentActivities, experiments } from "../../db/schema";
import { runSyncedWrite, type SyncWriteDb } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import {
  clampRepositoryLimit,
  createStatusRecordTransitions,
  matchesRepositorySearch,
  type ResearchRecordStatus,
} from "../__shared__";
import { hypothesisRepository } from "../hypotheses";

type ExperimentRecord = typeof experiments.$inferSelect;
type ExperimentActivity = typeof experimentActivities.$inferSelect;

type ExperimentActivityInput = {
  experimentId: string;
  actor: string;
  kind: string;
  body: string;
  payload: Record<string, unknown>;
  actorAgentId?: string;
};

function insertExperimentActivity({
  db,
  syncVersion,
  ...input
}: ExperimentActivityInput & {
  db: SyncWriteDb;
  syncVersion: number;
}): void {
  db.insert(experimentActivities)
    .values({
      experimentId: input.experimentId,
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

async function addExperimentActivity(input: ExperimentActivityInput): Promise<ExperimentActivity> {
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      insertExperimentActivity({ db, ...input, syncVersion });
    },
  });
  return requireLatestExperimentActivity({ experimentId: input.experimentId });
}

async function requireLatestExperimentActivity({
  experimentId,
}: {
  experimentId: string;
}): Promise<ExperimentActivity> {
  const rows = await getDb()
    .select()
    .from(experimentActivities)
    .where(eq(experimentActivities.experimentId, experimentId))
    .orderBy(asc(experimentActivities.createdAt), asc(experimentActivities.id));
  const activity = rows.at(-1);
  if (!activity) {
    throw new Error(`Experiment activity was not persisted: ${experimentId}`);
  }
  return activity;
}

async function getExperimentRecord({
  experimentId,
}: {
  experimentId: string;
}): Promise<ExperimentRecord | undefined> {
  return getDb().query.experiments.findFirst({
    where: eq(experiments.id, experimentId),
  });
}

async function requireExperimentRecord({
  experimentId,
}: {
  experimentId: string;
}): Promise<ExperimentRecord> {
  const experiment = await getExperimentRecord({ experimentId });
  if (!experiment) {
    throw new Error(`Experiment not found: ${experimentId}`);
  }
  return experiment;
}

const transitions = createStatusRecordTransitions<"experimentId", ExperimentRecord>({
  idKey: "experimentId",
  defaultActor: "agent",
  recordLabel: "Experiment",
  updateStatus: ({ db, id, status, syncVersion, updatedAt }) => {
    db.update(experiments)
      .set({
        status,
        syncVersion,
        updatedAt,
      })
      .where(eq(experiments.id, id))
      .run();
  },
  insertActivity: ({ db, id, actor, actorAgentId, kind, body, payload, syncVersion }) => {
    insertExperimentActivity({
      db,
      experimentId: id,
      actor,
      actorAgentId,
      kind,
      body,
      payload,
      syncVersion,
    });
  },
  requireRecord: async ({ id }) => {
    return requireExperimentRecord({ experimentId: id });
  },
});

export const experimentRepository = {
  async create({
    title,
    summary,
    createdByResearchTaskId,
    createdByAgentId,
    associatedHypothesisId,
    parentExperimentId,
    worktreePath,
    baseCommit,
    candidateCommit,
  }: {
    title: string;
    summary: string;
    createdByResearchTaskId?: string;
    createdByAgentId?: string;
    associatedHypothesisId: string;
    parentExperimentId?: string;
    worktreePath?: string;
    baseCommit?: string;
    candidateCommit?: string;
  }): Promise<ExperimentRecord> {
    await hypothesisRepository.require({ hypothesisId: associatedHypothesisId });
    const experimentId = crypto.randomUUID();
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(experiments)
          .values({
            id: experimentId,
            title,
            summary,
            createdByResearchTaskId,
            createdByAgentId,
            associatedHypothesisId,
            parentExperimentId,
            worktreePath,
            baseCommit,
            candidateCommit,
            status: "active",
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        insertExperimentActivity({
          db,
          experimentId,
          actor: "agent",
          actorAgentId: createdByAgentId,
          kind: "recorded",
          body: summary,
          payload: { activityType: "experiment_created" },
          syncVersion,
        });
      },
    });
    return requireExperimentRecord({ experimentId });
  },

  async get({ experimentId }: { experimentId: string }): Promise<ExperimentRecord | undefined> {
    return getExperimentRecord({ experimentId });
  },

  async findByWorktreePath({
    worktreePath,
  }: {
    worktreePath: string;
  }): Promise<ExperimentRecord | undefined> {
    return getDb().query.experiments.findFirst({
      where: eq(experiments.worktreePath, worktreePath),
    });
  },

  async require({ experimentId }: { experimentId: string }): Promise<ExperimentRecord> {
    return requireExperimentRecord({ experimentId });
  },

  async getWithActivities({ experimentId }: { experimentId: string }): Promise<{
    experiment: ExperimentRecord;
    activities: ExperimentActivity[];
  }> {
    const experiment = await requireExperimentRecord({ experimentId });
    const activities = await getDb()
      .select()
      .from(experimentActivities)
      .where(eq(experimentActivities.experimentId, experimentId))
      .orderBy(asc(experimentActivities.createdAt), asc(experimentActivities.id));
    return { experiment, activities };
  },

  async list({
    limit = 10,
  }: {
    limit?: number;
  } = {}): Promise<ExperimentRecord[]> {
    const rows = await getDb()
      .select()
      .from(experiments)
      .orderBy(desc(experiments.createdAt), desc(experiments.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async listByResearchTask({
    researchTaskId,
  }: {
    researchTaskId: string;
  }): Promise<ExperimentRecord[]> {
    return getDb()
      .select()
      .from(experiments)
      .where(eq(experiments.createdByResearchTaskId, researchTaskId))
      .orderBy(desc(experiments.createdAt), desc(experiments.id));
  },

  async search({
    query,
    status,
    limit = 10,
  }: {
    query?: string;
    status?: ResearchRecordStatus;
    limit?: number;
  } = {}): Promise<ExperimentRecord[]> {
    const rows = await getDb()
      .select()
      .from(experiments)
      .where(status ? eq(experiments.status, status) : undefined)
      .orderBy(desc(experiments.createdAt), desc(experiments.id));
    return rows
      .filter((experiment) =>
        matchesRepositorySearch({
          query,
          values: [
            experiment.id,
            experiment.title,
            experiment.summary,
            experiment.status,
            experiment.createdByResearchTaskId,
            experiment.createdByAgentId,
            experiment.associatedHypothesisId,
            experiment.parentExperimentId,
            experiment.worktreePath,
            experiment.baseCommit,
            experiment.candidateCommit,
          ],
        }),
      )
      .slice(0, clampRepositoryLimit({ limit }));
  },

  async addComment({
    experimentId,
    body,
    actor = "scientist",
    actorAgentId,
  }: {
    experimentId: string;
    body: string;
    actor?: string;
    actorAgentId?: string;
  }): Promise<ExperimentActivity> {
    return addExperimentActivity({
      experimentId,
      actor,
      actorAgentId,
      kind: "comment",
      body,
      payload: {},
    });
  },

  async addActivity(input: ExperimentActivityInput): Promise<ExperimentActivity> {
    return addExperimentActivity(input);
  },

  async updateWorktreeMetadata({
    experimentId,
    worktreePath,
    baseCommit,
  }: {
    experimentId: string;
    worktreePath: string;
    baseCommit: string;
  }): Promise<ExperimentRecord> {
    const updatedAt = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(experiments)
          .set({
            worktreePath,
            baseCommit,
            syncVersion,
            updatedAt,
          })
          .where(eq(experiments.id, experimentId))
          .run();
      },
    });
    return requireExperimentRecord({ experimentId });
  },

  async updateCandidateMetadata({
    experimentId,
    candidateCommit,
  }: {
    experimentId: string;
    candidateCommit: string;
  }): Promise<ExperimentRecord> {
    const updatedAt = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(experiments)
          .set({
            candidateCommit,
            syncVersion,
            updatedAt,
          })
          .where(eq(experiments.id, experimentId))
          .run();
      },
    });
    return requireExperimentRecord({ experimentId });
  },

  accept: transitions.accept,
  submit: transitions.submit,
  complete: transitions.complete,
  cancel: transitions.cancel,
  fail: transitions.fail,
};
