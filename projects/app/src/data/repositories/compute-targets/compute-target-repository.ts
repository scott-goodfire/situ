import { and, asc, eq, isNotNull, ne, or, type SQL } from "drizzle-orm";
import { DateTime } from "luxon";

import { getDb } from "../../db/client";
import { computeTargets } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { clampRepositoryLimit, PreconditionError } from "../__shared__";

export type ComputeTargetStatus = "idle" | "claimed" | "draining" | "dead";

type ComputeTargetRecord = typeof computeTargets.$inferSelect;

export const computeTargetRepository = {
  async upsert({
    computeTargetId,
    pool,
    kind = "local",
    label,
    metadata = {},
  }: {
    computeTargetId?: string;
    pool: string;
    kind?: string;
    label?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ComputeTargetRecord> {
    const id = computeTargetId ?? crypto.randomUUID();
    const existing = await getDb().query.computeTargets.findFirst({
      where: eq(computeTargets.id, id),
    });
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        const values = {
          id,
          pool,
          kind,
          label,
          metadataJson: JSON.stringify(metadata),
          syncVersion,
          syncDeleted: false,
          updatedAt: now,
        };
        if (existing) {
          db.update(computeTargets).set(values).where(eq(computeTargets.id, id)).run();
          return;
        }
        db.insert(computeTargets)
          .values({
            ...values,
            status: "idle",
            createdAt: now,
          })
          .run();
      },
    });
    return computeTargetRepository.require({ computeTargetId: id });
  },

  async search({
    pool,
    status,
    limit = 10,
  }: {
    pool?: string;
    status?: ComputeTargetStatus;
    limit?: number;
  } = {}): Promise<ComputeTargetRecord[]> {
    const predicates: SQL[] = [];
    if (pool) {
      predicates.push(eq(computeTargets.pool, pool));
    }
    if (status) {
      predicates.push(eq(computeTargets.status, status));
    }

    const rows = await getDb()
      .select()
      .from(computeTargets)
      .where(predicates.length > 0 ? and(...predicates) : undefined)
      .orderBy(asc(computeTargets.pool), asc(computeTargets.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async listAll(): Promise<ComputeTargetRecord[]> {
    return getDb()
      .select()
      .from(computeTargets)
      .orderBy(asc(computeTargets.pool), asc(computeTargets.createdAt), asc(computeTargets.id));
  },

  async listForPool({ pool }: { pool: string }): Promise<ComputeTargetRecord[]> {
    return getDb()
      .select()
      .from(computeTargets)
      .where(eq(computeTargets.pool, pool))
      .orderBy(asc(computeTargets.createdAt), asc(computeTargets.id));
  },

  async list({
    pool,
    limit = 10,
  }: {
    pool?: string;
    limit?: number;
  } = {}): Promise<ComputeTargetRecord[]> {
    const rows = pool
      ? await computeTargetRepository.listForPool({ pool })
      : await computeTargetRepository.listAll();
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async listClaimed(): Promise<ComputeTargetRecord[]> {
    return getDb()
      .select()
      .from(computeTargets)
      .where(
        or(
          eq(computeTargets.status, "claimed"),
          and(
            eq(computeTargets.status, "draining"),
            isNotNull(computeTargets.claimedByResearchTaskId),
          ),
        ),
      )
      .orderBy(asc(computeTargets.claimedAt), asc(computeTargets.id));
  },

  async poolExists({ pool }: { pool: string }): Promise<boolean> {
    const target = await getDb().query.computeTargets.findFirst({
      where: and(eq(computeTargets.pool, pool), ne(computeTargets.status, "dead")),
    });
    return Boolean(target);
  },

  async claimForPool({
    pool,
    researchTaskId,
    leaseSeconds = 600,
  }: {
    pool: string;
    researchTaskId: string;
    leaseSeconds?: number;
  }): Promise<ComputeTargetRecord | undefined> {
    const candidates = await getDb()
      .select({ id: computeTargets.id })
      .from(computeTargets)
      .where(and(eq(computeTargets.pool, pool), eq(computeTargets.status, "idle")))
      .orderBy(asc(computeTargets.createdAt), asc(computeTargets.id));
    for (const candidate of candidates) {
      const now = dateTimeModule.nowIso();
      runSyncedWrite({
        write: ({ db, syncVersion }) => {
          db.update(computeTargets)
            .set({
              status: "claimed",
              claimedByResearchTaskId: researchTaskId,
              claimedAt: now,
              leaseExpiresAt: DateTime.utc().plus({ seconds: leaseSeconds }).toISO(),
              lastHeartbeat: now,
              syncVersion,
              updatedAt: now,
            })
            .where(
              and(
                eq(computeTargets.id, candidate.id),
                eq(computeTargets.pool, pool),
                eq(computeTargets.status, "idle"),
              ),
            )
            .run();
        },
      });
      const claimed = await computeTargetRepository.require({
        computeTargetId: candidate.id,
      });
      if (claimed.status === "claimed" && claimed.claimedByResearchTaskId === researchTaskId) {
        return claimed;
      }
    }
    return undefined;
  },

  async claim({
    computeTargetId,
    researchTaskId,
    leaseSeconds = 600,
  }: {
    computeTargetId: string;
    researchTaskId?: string;
    leaseSeconds?: number;
  }): Promise<ComputeTargetRecord> {
    const current = await computeTargetRepository.require({ computeTargetId });
    if (current.status !== "idle") {
      throw new PreconditionError({
        code: "compute_target_not_idle",
        hint: "Wait for the compute target to be released or claim a different target via claimForPool.",
        details: { computeTargetId, currentStatus: current.status },
      });
    }
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(computeTargets)
          .set({
            status: "claimed",
            claimedByResearchTaskId: researchTaskId,
            claimedAt: now,
            leaseExpiresAt: DateTime.utc().plus({ seconds: leaseSeconds }).toISO(),
            lastHeartbeat: now,
            syncVersion,
            updatedAt: now,
          })
          .where(and(eq(computeTargets.id, computeTargetId), eq(computeTargets.status, "idle")))
          .run();
      },
    });
    const target = await computeTargetRepository.require({ computeTargetId });
    if (
      target.status !== "claimed" ||
      (researchTaskId !== undefined && target.claimedByResearchTaskId !== researchTaskId)
    ) {
      throw new PreconditionError({
        code: "compute_target_claim_race",
        hint: "Another claimer beat this attempt; re-fetch the target or claim a different one via claimForPool.",
        details: {
          computeTargetId,
          currentStatus: target.status,
          requestedResearchTaskId: researchTaskId,
          claimedByResearchTaskId: target.claimedByResearchTaskId,
        },
      });
    }
    return target;
  },

  async release({
    computeTargetId,
    owningResearchTaskId,
  }: {
    computeTargetId: string;
    owningResearchTaskId?: string;
  }): Promise<ComputeTargetRecord> {
    const current = await computeTargetRepository.require({ computeTargetId });
    if (current.status !== "claimed" && current.status !== "draining") {
      return current;
    }
    if (owningResearchTaskId && current.claimedByResearchTaskId !== owningResearchTaskId) {
      return current;
    }
    const now = dateTimeModule.nowIso();
    const status = current.status === "draining" ? "dead" : "idle";
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(computeTargets)
          .set({
            status,
            claimedByResearchTaskId: null,
            claimedAt: null,
            leaseExpiresAt: null,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(computeTargets.id, computeTargetId))
          .run();
      },
    });
    return computeTargetRepository.require({ computeTargetId });
  },

  async heartbeat({
    computeTargetId,
    owningResearchTaskId,
    leaseSeconds = 600,
  }: {
    computeTargetId: string;
    owningResearchTaskId?: string;
    leaseSeconds?: number;
  }): Promise<ComputeTargetRecord | undefined> {
    const current = await computeTargetRepository.require({ computeTargetId });
    if (
      current.status !== "claimed" ||
      (owningResearchTaskId && current.claimedByResearchTaskId !== owningResearchTaskId)
    ) {
      return undefined;
    }
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(computeTargets)
          .set({
            leaseExpiresAt: DateTime.utc().plus({ seconds: leaseSeconds }).toISO(),
            lastHeartbeat: now,
            syncVersion,
            updatedAt: now,
          })
          .where(
            and(
              eq(computeTargets.id, computeTargetId),
              eq(computeTargets.status, "claimed"),
              ...(owningResearchTaskId
                ? [eq(computeTargets.claimedByResearchTaskId, owningResearchTaskId)]
                : []),
            ),
          )
          .run();
      },
    });
    const target = await computeTargetRepository.require({ computeTargetId });
    if (
      target.status !== "claimed" ||
      (owningResearchTaskId && target.claimedByResearchTaskId !== owningResearchTaskId)
    ) {
      return undefined;
    }
    return target;
  },

  async drain({ computeTargetId }: { computeTargetId: string }): Promise<ComputeTargetRecord> {
    const current = await computeTargetRepository.require({ computeTargetId });
    if (current.status === "dead" || current.status === "draining") {
      return current;
    }
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(computeTargets)
          .set({
            status: "draining",
            syncVersion,
            updatedAt: now,
          })
          .where(eq(computeTargets.id, computeTargetId))
          .run();
      },
    });
    return computeTargetRepository.require({ computeTargetId });
  },

  async restore({ computeTargetId }: { computeTargetId: string }): Promise<ComputeTargetRecord> {
    const current = await computeTargetRepository.require({ computeTargetId });
    if (current.status !== "draining" || current.claimedByResearchTaskId) {
      return current;
    }
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(computeTargets)
          .set({
            status: "idle",
            syncVersion,
            updatedAt: now,
          })
          .where(eq(computeTargets.id, computeTargetId))
          .run();
      },
    });
    return computeTargetRepository.require({ computeTargetId });
  },

  async markDead({ computeTargetId }: { computeTargetId: string }): Promise<ComputeTargetRecord> {
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.update(computeTargets)
          .set({
            status: "dead",
            claimedByResearchTaskId: null,
            claimedAt: null,
            leaseExpiresAt: null,
            syncVersion,
            updatedAt: now,
          })
          .where(eq(computeTargets.id, computeTargetId))
          .run();
      },
    });
    return computeTargetRepository.require({ computeTargetId });
  },

  async get({
    computeTargetId,
  }: {
    computeTargetId: string;
  }): Promise<ComputeTargetRecord | undefined> {
    return getDb().query.computeTargets.findFirst({
      where: eq(computeTargets.id, computeTargetId),
    });
  },

  async require({ computeTargetId }: { computeTargetId: string }): Promise<ComputeTargetRecord> {
    const computeTarget = await computeTargetRepository.get({ computeTargetId });
    if (!computeTarget) {
      throw new PreconditionError({
        code: "compute_target_not_found",
        hint: "List or search compute targets; this id may be abbreviated or stale.",
        details: { computeTargetId },
      });
    }
    return computeTarget;
  },
};
