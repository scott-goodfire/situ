import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { hypotheses, hypothesisActivities } from "../../db/schema";
import { runSyncedWrite, type SyncWriteDb } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import {
  clampRepositoryLimit,
  createStatusRecordTransitions,
  matchesRepositorySearch,
  type ResearchRecordStatus,
} from "../__shared__";

type Hypothesis = typeof hypotheses.$inferSelect;
type HypothesisActivity = typeof hypothesisActivities.$inferSelect;

type CreateHypothesisInput = {
  title: string;
  summary: string;
  createdByResearchTaskId?: string;
  createdByAgentId?: string;
};

type HypothesisIdInput = {
  hypothesisId: string;
};

type ListInput = {
  limit?: number;
};

type SearchInput = ListInput & {
  query?: string;
  status?: ResearchRecordStatus;
};

type CommentInput = HypothesisIdInput & {
  body: string;
  actor?: string;
  actorAgentId?: string;
};

type ActivityInput = HypothesisIdInput & {
  actor: string;
  kind: string;
  body: string;
  payload: Record<string, unknown>;
  actorAgentId?: string;
};

async function findHypothesis({
  hypothesisId,
}: HypothesisIdInput): Promise<Hypothesis | undefined> {
  return getDb().query.hypotheses.findFirst({
    where: eq(hypotheses.id, hypothesisId),
  });
}

async function requireHypothesis({ hypothesisId }: HypothesisIdInput): Promise<Hypothesis> {
  const hypothesis = await findHypothesis({ hypothesisId });
  if (!hypothesis) {
    throw new Error(`Hypothesis not found: ${hypothesisId}`);
  }
  return hypothesis;
}

async function insertActivity({
  hypothesisId,
  actor,
  kind,
  body,
  payload,
  actorAgentId,
}: ActivityInput): Promise<HypothesisActivity> {
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      insertHypothesisActivity({
        db,
        hypothesisId,
        actor,
        actorAgentId,
        kind,
        body,
        payload,
        syncVersion,
      });
    },
  });
  const rows = await getDb()
    .select()
    .from(hypothesisActivities)
    .where(eq(hypothesisActivities.hypothesisId, hypothesisId))
    .orderBy(asc(hypothesisActivities.createdAt), asc(hypothesisActivities.id));
  const activity = rows.at(-1);
  if (!activity) {
    throw new Error(`Hypothesis activity was not persisted: ${hypothesisId}`);
  }
  return activity;
}

const transitions = createStatusRecordTransitions<"hypothesisId", Hypothesis>({
  idKey: "hypothesisId",
  defaultActor: "verifier",
  recordLabel: "Hypothesis",
  updateStatus({ db, id, status, syncVersion, updatedAt }) {
    db.update(hypotheses)
      .set({ status, syncVersion, updatedAt })
      .where(eq(hypotheses.id, id))
      .run();
  },
  insertActivity({ db, id, actor, actorAgentId, kind, body, payload, syncVersion }) {
    insertHypothesisActivity({
      db,
      hypothesisId: id,
      actor,
      actorAgentId,
      kind,
      body,
      payload,
      syncVersion,
    });
  },
  requireRecord({ id }) {
    return requireHypothesis({ hypothesisId: id });
  },
});

export const hypothesisRepository = {
  async create({
    title,
    summary,
    createdByResearchTaskId,
    createdByAgentId,
  }: CreateHypothesisInput): Promise<Hypothesis> {
    const now = dateTimeModule.nowIso();
    const hypothesisId = crypto.randomUUID();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(hypotheses)
          .values({
            id: hypothesisId,
            title,
            summary,
            createdByResearchTaskId,
            createdByAgentId,
            status: "triage",
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        insertHypothesisActivity({
          db,
          hypothesisId,
          actor: "agent",
          actorAgentId: createdByAgentId,
          kind: "recorded",
          body: summary,
          payload: { activityType: "hypothesis_created" },
          syncVersion,
        });
      },
    });
    const hypothesis = await findHypothesis({ hypothesisId });
    if (!hypothesis) {
      throw new Error(`Hypothesis was not persisted: ${hypothesisId}`);
    }
    return hypothesis;
  },

  async get(input: HypothesisIdInput): Promise<Hypothesis | undefined> {
    return findHypothesis(input);
  },

  async require(input: HypothesisIdInput): Promise<Hypothesis> {
    return requireHypothesis(input);
  },

  async getWithActivities({ hypothesisId }: HypothesisIdInput): Promise<{
    hypothesis: Hypothesis;
    activities: HypothesisActivity[];
  }> {
    const hypothesis = await requireHypothesis({ hypothesisId });
    const activities = await getDb()
      .select()
      .from(hypothesisActivities)
      .where(eq(hypothesisActivities.hypothesisId, hypothesisId))
      .orderBy(asc(hypothesisActivities.createdAt), asc(hypothesisActivities.id));
    return { hypothesis, activities };
  },

  async list({ limit = 10 }: ListInput = {}): Promise<Hypothesis[]> {
    const rows = await getDb()
      .select()
      .from(hypotheses)
      .orderBy(desc(hypotheses.createdAt), desc(hypotheses.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search({ query, status, limit = 10 }: SearchInput = {}): Promise<Hypothesis[]> {
    const rows = await getDb()
      .select()
      .from(hypotheses)
      .orderBy(desc(hypotheses.createdAt), desc(hypotheses.id));
    const filtered = rows.filter((hypothesis) => {
      if (status && hypothesis.status !== status) {
        return false;
      }
      return matchesRepositorySearch({
        query,
        values: [
          hypothesis.id,
          hypothesis.title,
          hypothesis.summary,
          hypothesis.status,
          hypothesis.createdByResearchTaskId,
          hypothesis.createdByAgentId,
        ],
      });
    });
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },

  async addComment({
    hypothesisId,
    body,
    actor = "verifier",
    actorAgentId,
  }: CommentInput): Promise<HypothesisActivity> {
    return insertActivity({
      hypothesisId,
      actor,
      actorAgentId,
      kind: "comment",
      body,
      payload: {},
    });
  },

  async accept(input: Parameters<typeof transitions.accept>[0]): Promise<Hypothesis> {
    return transitions.accept(input);
  },

  async submit(input: Parameters<typeof transitions.submit>[0]): Promise<Hypothesis> {
    return transitions.submit(input);
  },

  async complete(input: Parameters<typeof transitions.complete>[0]): Promise<Hypothesis> {
    return transitions.complete(input);
  },

  async cancel(input: Parameters<typeof transitions.cancel>[0]): Promise<Hypothesis> {
    return transitions.cancel(input);
  },

  async fail(input: Parameters<typeof transitions.fail>[0]): Promise<Hypothesis> {
    return transitions.fail(input);
  },
};

function insertHypothesisActivity({
  db,
  hypothesisId,
  actor,
  kind,
  body,
  payload,
  syncVersion,
  actorAgentId,
}: {
  db: SyncWriteDb;
  hypothesisId: string;
  actor: string;
  kind: string;
  body: string;
  payload: Record<string, unknown>;
  syncVersion: number;
  actorAgentId?: string;
}): void {
  db.insert(hypothesisActivities)
    .values({
      hypothesisId,
      actorAgentId,
      actor,
      kind,
      body,
      payloadJson: JSON.stringify(payload),
      syncVersion,
      syncDeleted: false,
    })
    .run();
}
