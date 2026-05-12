import type { Repository } from "@situ/common";
import { asc, desc, eq } from "drizzle-orm";

import { getResearchRecordsContext } from "../../context";
import { evaluationActivities, evaluations, measurements } from "../../schema";
import {
  clampRepositoryLimit,
  createStatusRecordTransitions,
  matchesRepositorySearch,
  nowIso,
  PreconditionError,
} from "../../__shared__";
import type { ResearchRecordStatus, ResearchRecordsDb } from "../../types";
import { baselineRepository } from "../baselines";
import { experimentRepository } from "../experiments";
import {
  measurementRepository,
  normalizeMeasurementPayload,
  type MeasurementPayload,
} from "../measurements";

type EvaluationRecord = typeof evaluations.$inferSelect;
type EvaluationActivity = typeof evaluationActivities.$inferSelect;
type MeasurementRecord = typeof measurements.$inferSelect;

type EvaluationActivityInput = {
  evaluationId: string;
  actor: string;
  kind: string;
  body: string;
  payload: Record<string, unknown>;
  actorAgentId?: string;
};

type CreateEvaluationInput = {
  title: string;
  summary: string;
  createdByResearchTaskId?: string;
  createdByAgentId?: string;
  associatedBaselineId?: string;
  associatedExperimentId?: string;
};

function insertEvaluationActivity({
  db,
  syncVersion,
  ...input
}: EvaluationActivityInput & {
  db: ResearchRecordsDb;
  syncVersion: number;
}): void {
  db.insert(evaluationActivities)
    .values({
      evaluationId: input.evaluationId,
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

async function addEvaluationActivity(input: EvaluationActivityInput): Promise<EvaluationActivity> {
  const { runSyncedWrite } = getResearchRecordsContext();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      insertEvaluationActivity({ db, ...input, syncVersion });
    },
  });
  return requireLatestEvaluationActivity({ evaluationId: input.evaluationId });
}

async function requireLatestEvaluationActivity({
  evaluationId,
}: {
  evaluationId: string;
}): Promise<EvaluationActivity> {
  const db = getResearchRecordsContext().getDb();
  const rows = await db
    .select()
    .from(evaluationActivities)
    .where(eq(evaluationActivities.evaluationId, evaluationId))
    .orderBy(asc(evaluationActivities.createdAt), asc(evaluationActivities.id));
  const activity = rows.at(-1);
  if (!activity) {
    throw new PreconditionError({
      code: "evaluation_activity_not_persisted",
      hint: "Evaluation activity write did not produce a row; this is an internal invariant violation, retry or report.",
      details: { evaluationId },
    });
  }
  return activity;
}

async function getEvaluationRecord({
  evaluationId,
}: {
  evaluationId: string;
}): Promise<EvaluationRecord | undefined> {
  const db = getResearchRecordsContext().getDb();
  const [row] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.id, evaluationId))
    .limit(1);
  return row;
}

async function requireEvaluationRecord({
  evaluationId,
}: {
  evaluationId: string;
}): Promise<EvaluationRecord> {
  const evaluation = await getEvaluationRecord({ evaluationId });
  if (!evaluation) {
    throw new PreconditionError({
      code: "evaluation_not_found",
      hint: "List or search evaluations; this id may be abbreviated or stale.",
      details: { evaluationId },
    });
  }
  return evaluation;
}

async function createEvaluationWithActivity({
  title,
  summary,
  createdByResearchTaskId,
  createdByAgentId,
  associatedBaselineId,
  associatedExperimentId,
}: CreateEvaluationInput): Promise<EvaluationRecord> {
  const { runSyncedWrite } = getResearchRecordsContext();
  const evaluationId = crypto.randomUUID();
  const now = nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.insert(evaluations)
        .values({
          id: evaluationId,
          title,
          summary,
          createdByResearchTaskId,
          createdByAgentId,
          associatedBaselineId,
          associatedExperimentId,
          status: "active",
          syncVersion,
          syncDeleted: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      insertEvaluationActivity({
        db,
        evaluationId,
        actor: "agent",
        actorAgentId: createdByAgentId,
        kind: "recorded",
        body: summary,
        payload: { activityType: "evaluation_created" },
        syncVersion,
      });
    },
  });
  return requireEvaluationRecord({ evaluationId });
}

const transitions = createStatusRecordTransitions<"evaluationId", EvaluationRecord>({
  idKey: "evaluationId",
  defaultActor: "agent",
  recordLabel: "Evaluation",
  updateStatus: ({ db, id, status, syncVersion, updatedAt }) => {
    db.update(evaluations)
      .set({ status, syncVersion, updatedAt })
      .where(eq(evaluations.id, id))
      .run();
  },
  insertActivity: ({ db, id, actor, actorAgentId, kind, body, payload, syncVersion }) => {
    insertEvaluationActivity({
      db,
      evaluationId: id,
      actor,
      actorAgentId,
      kind,
      body,
      payload,
      syncVersion,
    });
  },
  requireRecord: async ({ id }) => {
    return requireEvaluationRecord({ evaluationId: id });
  },
});

export const evaluationRepository = {
  async create(input: CreateEvaluationInput): Promise<EvaluationRecord> {
    return createEvaluationWithActivity(input);
  },

  async get({ evaluationId }: { evaluationId: string }): Promise<EvaluationRecord | undefined> {
    return getEvaluationRecord({ evaluationId });
  },

  async require({ evaluationId }: { evaluationId: string }): Promise<EvaluationRecord> {
    return requireEvaluationRecord({ evaluationId });
  },

  async getWithActivities({ evaluationId }: { evaluationId: string }): Promise<{
    evaluation: EvaluationRecord;
    activities: EvaluationActivity[];
    measurements: MeasurementRecord[];
  }> {
    const evaluation = await requireEvaluationRecord({ evaluationId });
    const db = getResearchRecordsContext().getDb();
    const [activities, measurementRows] = await Promise.all([
      db
        .select()
        .from(evaluationActivities)
        .where(eq(evaluationActivities.evaluationId, evaluationId))
        .orderBy(asc(evaluationActivities.createdAt), asc(evaluationActivities.id)),
      db
        .select()
        .from(measurements)
        .where(eq(measurements.evaluationId, evaluationId))
        .orderBy(asc(measurements.createdAt), asc(measurements.id)),
    ]);
    return { evaluation, activities, measurements: measurementRows };
  },

  async list({
    limit = 10,
  }: {
    limit?: number;
  } = {}): Promise<EvaluationRecord[]> {
    const db = getResearchRecordsContext().getDb();
    const rows = await db
      .select()
      .from(evaluations)
      .orderBy(desc(evaluations.createdAt), desc(evaluations.id));
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
  } = {}): Promise<EvaluationRecord[]> {
    const db = getResearchRecordsContext().getDb();
    const rows = await db
      .select()
      .from(evaluations)
      .where(status ? eq(evaluations.status, status) : undefined)
      .orderBy(desc(evaluations.createdAt), desc(evaluations.id));
    return rows
      .filter((evaluation) =>
        matchesRepositorySearch({
          query,
          values: [
            evaluation.id,
            evaluation.title,
            evaluation.summary,
            evaluation.status,
            evaluation.createdByResearchTaskId,
            evaluation.createdByAgentId,
            evaluation.associatedBaselineId,
            evaluation.associatedExperimentId,
          ],
        }),
      )
      .slice(0, clampRepositoryLimit({ limit }));
  },

  async addComment({
    evaluationId,
    body,
    actor = "scientist",
    actorAgentId,
  }: {
    evaluationId: string;
    body: string;
    actor?: string;
    actorAgentId?: string;
  }): Promise<EvaluationActivity> {
    return addEvaluationActivity({
      evaluationId,
      actor,
      actorAgentId,
      kind: "comment",
      body,
      payload: {},
    });
  },

  async recordExperimentComparison({
    baselineId,
    experimentId,
    title,
    summary,
    body,
    createdByResearchTaskId,
    createdByAgentId,
    command,
    baselineOutput,
    candidateOutput,
    payload = {},
  }: {
    baselineId: string;
    experimentId: string;
    title: string;
    summary: string;
    body: string;
    createdByResearchTaskId?: string;
    createdByAgentId?: string;
    command?: string;
    baselineOutput?: string;
    candidateOutput?: string;
    payload?: MeasurementPayload;
  }): Promise<{
    evaluation: EvaluationRecord;
    measurement: Awaited<ReturnType<typeof measurementRepository.record>>;
  }> {
    const [baseline, experiment] = await Promise.all([
      baselineRepository.require({ baselineId }),
      experimentRepository.require({ experimentId }),
    ]);
    if (!experiment.baseCommit) {
      throw new PreconditionError({
        code: "no_base_commit",
        hint: "Experiment has no base commit recorded. Recreate the experiment via create_experiment so its worktree records a base commit before recording a comparison.",
        details: { experimentId },
      });
    }
    if (!experiment.candidateCommit) {
      throw new PreconditionError({
        code: "no_candidate_commit",
        hint: "Experiment has no captured candidate commit. Call capture_experiment_candidate({ experimentId }) before recording a comparison.",
        details: { experimentId },
      });
    }

    const { runSyncedWrite } = getResearchRecordsContext();
    const evaluationId = crypto.randomUUID();
    const measurementId = crypto.randomUUID();
    const now = nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(evaluations)
          .values({
            id: evaluationId,
            title,
            summary,
            createdByResearchTaskId,
            createdByAgentId,
            associatedBaselineId: baseline.id,
            associatedExperimentId: experiment.id,
            status: "active",
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        insertEvaluationActivity({
          db,
          evaluationId,
          actor: "agent",
          actorAgentId: createdByAgentId,
          kind: "recorded",
          body: summary,
          payload: { activityType: "evaluation_created" },
          syncVersion,
        });
        db.insert(measurements)
          .values({
            id: measurementId,
            body,
            actor: "scientist",
            createdByResearchTaskId,
            createdByAgentId,
            evaluationId,
            payloadJson: JSON.stringify(
              normalizeMeasurementPayload({
                payload: {
                  ...payload,
                  measurementType: "baseline_candidate_comparison",
                  baselineId: baseline.id,
                  baselineTitle: baseline.title,
                  experimentId: experiment.id,
                  experimentTitle: experiment.title,
                  baseCommit: experiment.baseCommit,
                  candidateCommit: experiment.candidateCommit,
                  command,
                  baselineOutput,
                  candidateOutput,
                },
              }),
            ),
            syncVersion,
            syncDeleted: false,
          })
          .run();
      },
    });

    const [evaluation, measurement] = await Promise.all([
      requireEvaluationRecord({ evaluationId }),
      measurementRepository.require({ measurementId }),
    ]);
    return { evaluation, measurement };
  },

  accept: transitions.accept,
  submit: transitions.submit,
  complete: transitions.complete,
  cancel: transitions.cancel,
  fail: transitions.fail,
} satisfies Repository<EvaluationRecord, "evaluationId">;
