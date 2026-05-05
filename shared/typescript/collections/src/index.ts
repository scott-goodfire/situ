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

type ApplyBootstrapOptions = {
  collections: AlmanacCollections;
  bootstrap: CollectionsBootstrapResult;
};

type ApplyCollectionUpsertOptions = {
  collections: AlmanacCollections;
  upsert: CollectionUpsertedParams;
};

type HydrateCollectionOptions<T extends object> = {
  collection: Collection<T, string>;
  records: T[];
};

type UpsertRecordOptions<T extends object> = {
  collection: Collection<T, string>;
  key: string;
  record: T;
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

export async function applyBootstrap({
  collections,
  bootstrap,
}: ApplyBootstrapOptions): Promise<void> {
  await Promise.all([
    hydrateCollection({
      collection: collections.runs,
      records: bootstrap.runs,
    }),
    hydrateCollection({
      collection: collections.experiments,
      records: bootstrap.experiments,
    }),
    hydrateCollection({
      collection: collections.events,
      records: bootstrap.events,
    }),
  ]);
}

export async function applyCollectionUpsert({
  collections,
  upsert,
}: ApplyCollectionUpsertOptions): Promise<void> {
  if (upsert.collection === "runs") {
    await upsertRecord({
      collection: collections.runs,
      key: upsert.key,
      record: upsert.record as unknown as RunRecord,
    });
    return;
  }

  if (upsert.collection === "experiments") {
    await upsertRecord({
      collection: collections.experiments,
      key: upsert.key,
      record: upsert.record as unknown as ExperimentRecord,
    });
    return;
  }

  await upsertRecord({
    collection: collections.events,
    key: upsert.key,
    record: upsert.record as unknown as EventRecord,
  });
}

async function hydrateCollection<T extends object>({
  collection,
  records,
}: HydrateCollectionOptions<T>): Promise<void> {
  await collection.preload();

  for (const record of records) {
    await upsertRecord({
      collection,
      key: collection.config.getKey(record),
      record,
    });
  }
}

async function upsertRecord<T extends object>({
  collection,
  key,
  record,
}: UpsertRecordOptions<T>): Promise<void> {
  await collection.preload();

  if (collection.has(key)) {
    const transaction = collection.update(key, (draft) => {
      Object.assign(draft, record);
    });

    await persist({ transaction });
    return;
  }

  const transaction = collection.insert(record);
  await persist({ transaction });
}

async function persist({ transaction }: { transaction: Transaction }): Promise<void> {
  await transaction.isPersisted.promise;
}
