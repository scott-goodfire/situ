import {
  createCollection,
  localOnlyCollectionOptions,
  type Collection,
  type Transaction,
} from "@tanstack/db";
import type {
  ArtifactRecord,
  CollectionUpsertedParams,
  CollectionsBootstrapResult,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisExperimentLinkRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";

export type AlmanacCollectionName = CollectionUpsertedParams["collection"];

export type AlmanacCollections = {
  objectives: Collection<ObjectiveRecord, string>;
  sessions: Collection<SessionRecord, string>;
  hypotheses: Collection<HypothesisRecord, string>;
  experiments: Collection<ExperimentRecord, string>;
  evaluations: Collection<EvaluationRecord, string>;
  hypothesisExperimentLinks: Collection<HypothesisExperimentLinkRecord, string>;
  hypothesisActivities: Collection<HypothesisActivityRecord, string>;
  experimentActivities: Collection<ExperimentActivityRecord, string>;
  evaluationActivities: Collection<EvaluationActivityRecord, string>;
  artifacts: Collection<ArtifactRecord, string>;
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
    objectives: createCollection(
      localOnlyCollectionOptions<ObjectiveRecord, string>({
        id: "almanac-objectives",
        getKey: (objective) => objective.id,
      }),
    ),
    sessions: createCollection(
      localOnlyCollectionOptions<SessionRecord, string>({
        id: "almanac-sessions",
        getKey: (session) => session.id,
      }),
    ),
    hypotheses: createCollection(
      localOnlyCollectionOptions<HypothesisRecord, string>({
        id: "almanac-hypotheses",
        getKey: (hypothesis) => hypothesis.id,
      }),
    ),
    experiments: createCollection(
      localOnlyCollectionOptions<ExperimentRecord, string>({
        id: "almanac-experiments",
        getKey: (experiment) => experiment.id,
      }),
    ),
    evaluations: createCollection(
      localOnlyCollectionOptions<EvaluationRecord, string>({
        id: "almanac-evaluations",
        getKey: (evaluation) => evaluation.id,
      }),
    ),
    hypothesisExperimentLinks: createCollection(
      localOnlyCollectionOptions<HypothesisExperimentLinkRecord, string>({
        id: "almanac-hypothesis-experiment-links",
        getKey: (link) => `${link.hypothesis_id}:${link.experiment_id}`,
      }),
    ),
    hypothesisActivities: createCollection(
      localOnlyCollectionOptions<HypothesisActivityRecord, string>({
        id: "almanac-hypothesis-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    experimentActivities: createCollection(
      localOnlyCollectionOptions<ExperimentActivityRecord, string>({
        id: "almanac-experiment-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    evaluationActivities: createCollection(
      localOnlyCollectionOptions<EvaluationActivityRecord, string>({
        id: "almanac-evaluation-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    artifacts: createCollection(
      localOnlyCollectionOptions<ArtifactRecord, string>({
        id: "almanac-artifacts",
        getKey: (artifact) => artifact.id,
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
      collection: collections.objectives,
      records: bootstrap.objectives ?? [],
    }),
    hydrateCollection({
      collection: collections.sessions,
      records: bootstrap.sessions ?? [],
    }),
    hydrateCollection({
      collection: collections.hypotheses,
      records: bootstrap.hypotheses ?? [],
    }),
    hydrateCollection({
      collection: collections.experiments,
      records: bootstrap.experiments ?? [],
    }),
    hydrateCollection({
      collection: collections.evaluations,
      records: bootstrap.evaluations ?? [],
    }),
    hydrateCollection({
      collection: collections.hypothesisExperimentLinks,
      records: bootstrap.hypothesis_experiment_links ?? [],
    }),
    hydrateCollection({
      collection: collections.hypothesisActivities,
      records: bootstrap.hypothesis_activities ?? [],
    }),
    hydrateCollection({
      collection: collections.experimentActivities,
      records: bootstrap.experiment_activities ?? [],
    }),
    hydrateCollection({
      collection: collections.evaluationActivities,
      records: bootstrap.evaluation_activities ?? [],
    }),
    hydrateCollection({
      collection: collections.artifacts,
      records: bootstrap.artifacts ?? [],
    }),
    hydrateCollection({
      collection: collections.events,
      records: bootstrap.events ?? [],
    }),
  ]);
}

export async function applyCollectionUpsert({
  collections,
  upsert,
}: ApplyCollectionUpsertOptions): Promise<void> {
  if (upsert.collection === "objectives") {
    await upsertRecord({
      collection: collections.objectives,
      key: upsert.key,
      record: upsert.record as unknown as ObjectiveRecord,
    });
    return;
  }

  if (upsert.collection === "sessions") {
    await upsertRecord({
      collection: collections.sessions,
      key: upsert.key,
      record: upsert.record as unknown as SessionRecord,
    });
    return;
  }

  if (upsert.collection === "hypotheses") {
    await upsertRecord({
      collection: collections.hypotheses,
      key: upsert.key,
      record: upsert.record as unknown as HypothesisRecord,
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

  if (upsert.collection === "evaluations") {
    await upsertRecord({
      collection: collections.evaluations,
      key: upsert.key,
      record: upsert.record as unknown as EvaluationRecord,
    });
    return;
  }

  if (upsert.collection === "hypothesis_experiment_links") {
    await upsertRecord({
      collection: collections.hypothesisExperimentLinks,
      key: upsert.key,
      record: upsert.record as unknown as HypothesisExperimentLinkRecord,
    });
    return;
  }

  if (upsert.collection === "hypothesis_activities") {
    await upsertRecord({
      collection: collections.hypothesisActivities,
      key: upsert.key,
      record: upsert.record as unknown as HypothesisActivityRecord,
    });
    return;
  }

  if (upsert.collection === "experiment_activities") {
    await upsertRecord({
      collection: collections.experimentActivities,
      key: upsert.key,
      record: upsert.record as unknown as ExperimentActivityRecord,
    });
    return;
  }

  if (upsert.collection === "evaluation_activities") {
    await upsertRecord({
      collection: collections.evaluationActivities,
      key: upsert.key,
      record: upsert.record as unknown as EvaluationActivityRecord,
    });
    return;
  }

  if (upsert.collection === "artifacts") {
    await upsertRecord({
      collection: collections.artifacts,
      key: upsert.key,
      record: upsert.record as unknown as ArtifactRecord,
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
