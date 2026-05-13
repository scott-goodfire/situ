export type SyncMetadata = {
  syncVersion: number;
  syncDeleted: boolean;
};

export type WithSyncMetadata<T> = T & SyncMetadata;

/**
 * Creates sync metadata for a new visible record.
 */
export const createSyncMetadata = (): SyncMetadata => ({
  syncDeleted: false,
  syncVersion: 1,
});

/**
 * Advances sync metadata for a changed visible record.
 */
export const advanceSyncMetadata = ({ record }: { record: SyncMetadata }): SyncMetadata => ({
  syncDeleted: record.syncDeleted,
  syncVersion: record.syncVersion + 1,
});
