import type { PatchOperation } from "replicache";
import { getDb } from "../data/db/client";
import type { Session } from "../data/db/schema";
import { currentSyncVersion } from "../data/db/sync";
import { syncLocalSettingsFromFilesystem } from "../secrets/local-settings-sync";
import { put } from "./replicache-patch";
import { replicacheRecord } from "./replicache-records";
import { replicacheSyncPatch, sessionSyncPatch } from "./replicache-sync";

export async function buildReplicachePatch({ cookie }: { cookie: unknown }): Promise<{
  cookie: number;
  patch: PatchOperation[];
}> {
  // Intentionally not synced: syncState and replicacheClients are server-side sync bookkeeping.
  await syncLocalSettingsFromFilesystem();
  const nextVersion = await currentSyncVersion();
  const previousVersion = parseCookie({ cookie });
  if (previousVersion === nextVersion) {
    return { cookie: nextVersion, patch: [] };
  }

  const includeReset = previousVersion <= 0 || previousVersion > nextVersion;
  const sinceVersion = includeReset ? 0 : previousVersion;
  const [sessionGroup, syncedCollectionPatch] = await Promise.all([
    sessionSyncPatch({ sinceVersion }),
    replicacheSyncPatch({ sinceVersion }),
  ]);
  const runtimeStatus = await runtimeStatusPatchValue({
    currentSession: sessionGroup.currentSession,
  });

  const patch: PatchOperation[] = [
    ...(includeReset ? [{ op: "clear" } as PatchOperation] : []),
    put({ key: "status", value: runtimeStatus }),
    ...sessionGroup.patch,
    ...syncedCollectionPatch,
  ];

  return { cookie: nextVersion, patch };
}

function parseCookie({ cookie }: { cookie: unknown }): number {
  return typeof cookie === "number" && Number.isInteger(cookie) && cookie >= 0 ? cookie : 0;
}

async function runtimeStatusPatchValue({ currentSession }: { currentSession: Session | null }) {
  const db = getDb();
  return replicacheRecord.runtimeStatus({
    agent: (await db.query.claudeAgents.findFirst()) ?? null,
    environment: (await db.query.claudeAgentEnvironments.findFirst()) ?? null,
    session: currentSession,
  });
}
