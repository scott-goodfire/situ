import { eq } from "drizzle-orm";

import { session as sessionTable } from "../../../data/db/schema";
import { runSyncedWrite } from "../../../data/db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { ensureLocalSession } from "./local-session";
import type { ManagedAgentsBeta } from "./types";

export const MEMORY_STORE_INSTRUCTIONS =
  "Your durable scratchpad for this research session lives at /mnt/memory/. Only you (the Manager) can read or write this store; the Scientist, Verifier, Scribe, and Reporter cannot see it. Use it to persist context you'll need across turns — best-known metric, candidate hashes already tried, hypotheses you've ruled out, open questions for the user, and anything you'd otherwise re-derive every turn. Treat the contents as private to this situ session.";

export async function ensureClaudeMemoryStore({
  beta,
}: {
  beta: ManagedAgentsBeta;
}): Promise<{ claudeMemoryStoreId: string }> {
  const localSession = await ensureLocalSession();
  if (localSession.claudeMemoryStoreId) {
    return { claudeMemoryStoreId: localSession.claudeMemoryStoreId };
  }

  const memoryStore = await beta.memoryStores.create({
    name: `situ session ${localSession.id}`,
    description:
      "Per-situ-session scratchpad for the Manager — durable across turns within this research run, not shared with other roles.",
  });
  const claudeMemoryStoreId = String(memoryStore.id);

  const now = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db: tx, syncVersion }) => {
      tx.update(sessionTable)
        .set({
          claudeMemoryStoreId,
          syncVersion,
          updatedAt: now,
        })
        .where(eq(sessionTable.id, localSession.id))
        .run();
    },
  });

  return { claudeMemoryStoreId };
}
