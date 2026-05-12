import type { Repository } from "@situ/common";
import { desc, eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { feedEntries } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { textModule } from "../../../modules/text";
import { clampRepositoryLimit, PreconditionError } from "../__shared__";
import { researchProjectRepository } from "@situ/research-projects";

type FeedEntryRecord = typeof feedEntries.$inferSelect;
type FeedEntrySeverity = FeedEntryRecord["severity"];

const feedEntrySeverities = new Set<FeedEntrySeverity>(["info", "progress", "stuck", "failure"]);

export const feedEntryRepository = {
  async create({
    researchProjectId,
    summaryMarkdown,
    severity,
    citedAppEventIds = [],
    windowStartedAt,
    windowEndedAt,
    createdByAgentId,
  }: {
    researchProjectId: string;
    summaryMarkdown: string;
    severity: FeedEntrySeverity;
    citedAppEventIds?: string[];
    windowStartedAt: string;
    windowEndedAt: string;
    createdByAgentId?: string;
  }): Promise<FeedEntryRecord> {
    assertFeedEntrySeverity({ severity });
    await researchProjectRepository.require({ researchProjectId });

    const now = dateTimeModule.nowIso();
    const feedEntryId = crypto.randomUUID();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        db.insert(feedEntries)
          .values({
            id: feedEntryId,
            researchProjectId,
            summaryMarkdown: textModule.requiredText({
              value: summaryMarkdown,
              label: "summaryMarkdown",
            }),
            severity,
            citedAppEventIdsJson: JSON.stringify(citedAppEventIds),
            windowStartedAt,
            windowEndedAt,
            createdByAgentId,
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      },
    });
    return feedEntryRepository.require({ feedEntryId });
  },

  async get({ feedEntryId }: { feedEntryId: string }): Promise<FeedEntryRecord | undefined> {
    return getDb().query.feedEntries.findFirst({
      where: eq(feedEntries.id, feedEntryId),
    });
  },

  async require({ feedEntryId }: { feedEntryId: string }): Promise<FeedEntryRecord> {
    const record = await feedEntryRepository.get({ feedEntryId });
    if (!record) {
      throw new PreconditionError({
        code: "feed_entry_not_found",
        hint: "List feed entries for the ResearchProject; this id may be abbreviated or stale.",
        details: { feedEntryId },
      });
    }
    return record;
  },

  async list({
    researchProjectId,
    limit,
  }: {
    researchProjectId: string;
    limit?: number;
  }): Promise<FeedEntryRecord[]> {
    return getDb().query.feedEntries.findMany({
      where: eq(feedEntries.researchProjectId, researchProjectId),
      orderBy: desc(feedEntries.createdAt),
      limit: clampRepositoryLimit({ limit: limit ?? 100, max: 500 }),
    });
  },

  async latest({
    researchProjectId,
  }: {
    researchProjectId: string;
  }): Promise<FeedEntryRecord | undefined> {
    const rows = await getDb().query.feedEntries.findMany({
      where: eq(feedEntries.researchProjectId, researchProjectId),
      orderBy: desc(feedEntries.createdAt),
      limit: 1,
    });
    return rows[0];
  },
} satisfies Repository<FeedEntryRecord, "feedEntryId">;

function assertFeedEntrySeverity({ severity }: { severity: string }): void {
  if (!feedEntrySeverities.has(severity as FeedEntrySeverity)) {
    throw new PreconditionError({
      code: "feed_entry_invalid_severity",
      hint: "Use one of: info, progress, stuck, failure.",
      details: { severity, allowed: Array.from(feedEntrySeverities) },
    });
  }
}
