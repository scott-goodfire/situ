import { desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { entityLinks } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { clampRepositoryLimit, matchesRepositorySearch, PreconditionError } from "../__shared__";

type EntityLinkRecord = typeof entityLinks.$inferSelect;

type CreateEntityLinkInput = {
  fromKind: string;
  fromId: string;
  toKind: string;
  toId: string;
  relationship: string;
};

type EntityLinkIdInput = {
  entityLinkId: string;
};

type ListEntityLinksInput = {
  limit?: number;
};

type SearchEntityLinksInput = {
  query?: string;
  fromKind?: string;
  fromId?: string;
  toKind?: string;
  toId?: string;
  relationship?: string;
  limit?: number;
};

const entityLinkSearchFields = ["fromKind", "fromId", "toKind", "toId", "relationship"] as const;

async function getEntityLinkRecord({
  entityLinkId,
}: EntityLinkIdInput): Promise<EntityLinkRecord | undefined> {
  return getDb().query.entityLinks.findFirst({
    where: eq(entityLinks.id, entityLinkId),
  });
}

async function requireEntityLinkRecord({
  entityLinkId,
}: EntityLinkIdInput): Promise<EntityLinkRecord> {
  const entityLink = await getEntityLinkRecord({ entityLinkId });
  if (!entityLink) {
    throw new PreconditionError({
      code: "entity_link_not_found",
      hint: "List or search entity links; this id may be abbreviated or stale.",
      details: { entityLinkId },
    });
  }
  return entityLink;
}

export const entityLinkRepository = {
  async create({
    fromKind,
    fromId,
    toKind,
    toId,
    relationship,
  }: CreateEntityLinkInput): Promise<EntityLinkRecord> {
    const entityLinkId = crypto.randomUUID();
    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(entityLinks)
          .values({
            id: entityLinkId,
            fromKind,
            fromId,
            toKind,
            toId,
            relationship,
            syncVersion,
            syncDeleted: false,
            createdAt: now,
          })
          .run();
      },
    });
    return requireEntityLinkRecord({ entityLinkId });
  },

  async get({ entityLinkId }: EntityLinkIdInput): Promise<EntityLinkRecord | undefined> {
    return getEntityLinkRecord({ entityLinkId });
  },

  async require({ entityLinkId }: EntityLinkIdInput): Promise<EntityLinkRecord> {
    return requireEntityLinkRecord({ entityLinkId });
  },

  async list({ limit = 10 }: ListEntityLinksInput = {}): Promise<EntityLinkRecord[]> {
    const rows = await getDb()
      .select()
      .from(entityLinks)
      .orderBy(desc(entityLinks.createdAt), desc(entityLinks.id));
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },

  async search(input: SearchEntityLinksInput = {}): Promise<EntityLinkRecord[]> {
    const { limit = 10 } = input;
    const rows = await getDb()
      .select()
      .from(entityLinks)
      .orderBy(desc(entityLinks.createdAt), desc(entityLinks.id));
    const filtered = rows.filter((entityLink) =>
      matchesEntityLinkSearchInput({ entityLink, input }),
    );
    return filtered.slice(0, clampRepositoryLimit({ limit }));
  },
};

function matchesEntityLinkSearchInput({
  entityLink,
  input,
}: {
  entityLink: EntityLinkRecord;
  input: SearchEntityLinksInput;
}): boolean {
  return (
    entityLinkSearchFields.every((field) =>
      matchesOptionalSearchField({ actual: entityLink[field], expected: input[field] }),
    ) &&
    matchesRepositorySearch({
      query: input.query,
      values: [
        entityLink.id,
        entityLink.fromKind,
        entityLink.fromId,
        entityLink.toKind,
        entityLink.toId,
        entityLink.relationship,
      ],
    })
  );
}

function matchesOptionalSearchField({
  actual,
  expected,
}: {
  actual: string;
  expected: string | undefined;
}): boolean {
  return !expected || actual === expected;
}
