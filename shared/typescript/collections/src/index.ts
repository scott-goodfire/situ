import {
  createCollection,
  localOnlyCollectionOptions,
  type Collection,
  type Transaction,
} from "@tanstack/db";
import type {
  CollectionUpsertedParams,
  CollectionsBootstrapResult,
  EventRecord,
  ExperimentRecord,
  RunRecord,
} from "@almanac/protocol";

export type AlmanacCollectionName = "runs" | "experiments" | "events";

export type AlmanacCollections = {
  runs: Collection<RunRecord, string>;
  experiments: Collection<ExperimentRecord, string>;
  events: Collection<EventRecord, string>;
};

export function createAlmanacCollections(): AlmanacCollections {
  return {
    runs: createCollection(
      localOnlyCollectionOptions<RunRecord, string>({
        id: "almanac-runs",
        getKey: (run) => run.id,
      }),
    ),
    experiments: createCollection(
      localOnlyCollectionOptions<ExperimentRecord, string>({
        id: "almanac-experiments",
        getKey: (experiment) => experiment.id,
      }),
    ),
    events: createCollection(
      localOnlyCollectionOptions<EventRecord, string>({
        id: "almanac-events",
        getKey: (event) => String(event.id),
      }),
    ),
  };
}

export async function applyBootstrap(
  collections: AlmanacCollections,
  bootstrap: CollectionsBootstrapResult,
): Promise<void> {
  await Promise.all([
    hydrateCollection(collections.runs, bootstrap.runs),
    hydrateCollection(collections.experiments, bootstrap.experiments),
    hydrateCollection(collections.events, bootstrap.events),
  ]);
}

export async function applyCollectionUpsert(
  collections: AlmanacCollections,
  upsert: CollectionUpsertedParams,
): Promise<void> {
  if (upsert.collection === "runs") {
    await upsertRecord(collections.runs, upsert.key, upsert.record as unknown as RunRecord);
    return;
  }

  if (upsert.collection === "experiments") {
    await upsertRecord(
      collections.experiments,
      upsert.key,
      upsert.record as unknown as ExperimentRecord,
    );
    return;
  }

  await upsertRecord(collections.events, upsert.key, upsert.record as unknown as EventRecord);
}

async function hydrateCollection<T extends object>(
  collection: Collection<T, string>,
  records: T[],
): Promise<void> {
  await collection.preload();
  for (const record of records) {
    await upsertRecord(collection, collection.config.getKey(record), record);
  }
}

async function upsertRecord<T extends object>(
  collection: Collection<T, string>,
  key: string,
  record: T,
): Promise<void> {
  await collection.preload();
  const transaction = collection.has(key)
    ? collection.update(key, (draft) => {
        Object.assign(draft, record);
      })
    : collection.insert(record);
  await persist(transaction);
}

async function persist(transaction: Transaction): Promise<void> {
  await transaction.isPersisted.promise;
}
