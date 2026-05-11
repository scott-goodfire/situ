import type { PatchOperation } from "replicache";

export type ReplicacheSyncInput = {
  sinceVersion: number;
};

export type ReplicacheSyncPatch = (input: ReplicacheSyncInput) => Promise<PatchOperation[]>;
