import { eq, sql } from "drizzle-orm";
import { logModule } from "../../modules/log";
import { dateTimeModule } from "../../modules/date-time";
import { obs } from "../../observability";
import { getDb } from "./client";
import { syncState } from "./schema";

const GLOBAL_SYNC_ID = "global";

export type SyncWriteDb = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

type SyncPoke = {
  version: number;
};

type SyncPokeListener = (poke: SyncPoke) => void;

const syncPokeListeners = new Set<SyncPokeListener>();

export function runSyncedWrite<Result>({
  write,
  notify = true,
}: {
  write: (input: { db: SyncWriteDb; syncVersion: number }) => Result;
  notify?: boolean;
}): { result: Result; syncVersion: number } {
  const txResult = getDb().transaction((tx) => {
    tx.update(syncState)
      .set({
        version: sql`${syncState.version} + 1`,
        updatedAt: dateTimeModule.nowIso(),
      })
      .where(eq(syncState.id, GLOBAL_SYNC_ID))
      .run();
    const row = tx.query.syncState.findFirst({ where: eq(syncState.id, GLOBAL_SYNC_ID) }).sync();
    const syncVersion = row?.version ?? 1;
    return {
      result: write({ db: tx, syncVersion }),
      syncVersion,
    };
  });
  if (notify) {
    notifySyncChanged({ version: txResult.syncVersion });
  }
  return txResult;
}

function notifySyncChanged({ version }: { version: number }): void {
  for (const listener of syncPokeListeners) {
    try {
      listener({ version });
    } catch (error) {
      logModule.error(obs.log.sync.pokeListenerFailed, { error });
    }
  }
}

export function subscribeSyncPokes({ listener }: { listener: SyncPokeListener }): () => void {
  syncPokeListeners.add(listener);
  return () => {
    syncPokeListeners.delete(listener);
  };
}

export async function currentSyncVersion(): Promise<number> {
  const row = await getDb().query.syncState.findFirst({
    where: eq(syncState.id, GLOBAL_SYNC_ID),
  });
  return row?.version ?? 1;
}
