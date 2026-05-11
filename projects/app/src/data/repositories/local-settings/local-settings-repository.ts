import { eq } from "drizzle-orm";

import { getDb } from "../../db/client";
import { localSettings } from "../../db/schema";
import { runSyncedWrite } from "../../db/sync";
import { dateTimeModule } from "../../../modules/date-time";

export type LocalSettingsRecord = typeof localSettings.$inferSelect;

const DEFAULT_LOCAL_SETTINGS_ID = "default";

export const localSettingsRepository = {
  async get({
    localSettingsId = DEFAULT_LOCAL_SETTINGS_ID,
  }: {
    localSettingsId?: string;
  } = {}): Promise<LocalSettingsRecord | undefined> {
    return getDb().query.localSettings.findFirst({
      where: eq(localSettings.id, localSettingsId),
    });
  },

  async require({
    localSettingsId = DEFAULT_LOCAL_SETTINGS_ID,
  }: {
    localSettingsId?: string;
  } = {}): Promise<LocalSettingsRecord> {
    const settings = await localSettingsRepository.get({ localSettingsId });
    if (!settings) {
      throw new Error(`LocalSettings not found: ${localSettingsId}`);
    }
    return settings;
  },

  async upsert({
    localSettingsId = DEFAULT_LOCAL_SETTINGS_ID,
    anthropicKeyConfigured,
  }: {
    localSettingsId?: string;
    anthropicKeyConfigured: boolean;
  }): Promise<LocalSettingsRecord> {
    const existing = await localSettingsRepository.get({ localSettingsId });
    if (existing?.anthropicKeyConfigured === anthropicKeyConfigured && !existing.syncDeleted) {
      return existing;
    }

    const now = dateTimeModule.nowIso();
    runSyncedWrite({
      write: ({ db, syncVersion }) => {
        if (existing) {
          db.update(localSettings)
            .set({
              anthropicKeyConfigured,
              syncVersion,
              syncDeleted: false,
              updatedAt: now,
            })
            .where(eq(localSettings.id, localSettingsId))
            .run();
          return;
        }

        db.insert(localSettings)
          .values({
            id: localSettingsId,
            anthropicKeyConfigured,
            syncVersion,
            syncDeleted: false,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      },
    });

    return localSettingsRepository.require({ localSettingsId });
  },
};
