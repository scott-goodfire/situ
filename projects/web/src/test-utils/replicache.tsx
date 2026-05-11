// Test utilities for Replicache-backed hooks. Construct a real Replicache
// instance with `kvStore: "mem"` (no IndexedDB), no pull/push URLs (no
// network), and a fresh randomized name per test. See:
// https://doc.replicache.dev/howto/unit-test
//
// Pair with `renderHook` from @testing-library/react and the
// <ReplicacheTestProvider> wrapper so any hook calling `useReplicache()`
// resolves to the test instance.
import {
  Replicache,
  type MutatorDefs,
  type ReadonlyJSONValue,
  type WriteTransaction,
} from "replicache";
import type { ReactNode } from "react";

import { ReplicacheContext } from "../app/replicache";

type SeedEntries = Record<string, ReadonlyJSONValue>;

type TestMutators = MutatorDefs & {
  seedTestData: (tx: WriteTransaction, entries: SeedEntries) => Promise<void>;
};

export type TestReplicache = Replicache<TestMutators>;

export function createTestReplicache(): TestReplicache {
  return new Replicache<TestMutators>({
    name: `situ-test-${crypto.randomUUID()}`,
    schemaVersion: "2",
    kvStore: "mem",
    pullURL: undefined,
    pushURL: undefined,
    pullInterval: null,
    pushDelay: 1_000_000,
    logLevel: "error",
    mutators: {
      seedTestData: async (tx, entries) => {
        for (const [key, value] of Object.entries(entries)) {
          await tx.set(key, value);
        }
      },
    },
  });
}

export async function seedReplicache(rep: TestReplicache, entries: SeedEntries): Promise<void> {
  await rep.mutate.seedTestData(entries);
}

export function ReplicacheTestProvider({
  rep,
  children,
}: {
  rep: Replicache;
  children: ReactNode;
}) {
  return (
    <ReplicacheContext.Provider value={{ rep, synced: true }}>
      {children}
    </ReplicacheContext.Provider>
  );
}
