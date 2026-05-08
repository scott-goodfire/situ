import {
  createCollection,
  createTransaction,
  localOnlyCollectionOptions,
  type Collection,
  type PendingMutation,
  type Transaction,
} from "@tanstack/db";
import type {
  AgentRecord,
  AnalysisActivityRecord,
  AnalysisRecord,
  ArtifactRecord,
  CollectionChangeParams,
  BaselineActivityRecord,
  BaselineRecord,
  CollectionUpsertedParams,
  CollectionsBootstrapResult,
  CollectionsBootstrapParams,
  CollectionsChangesSinceParams,
  CollectionsChangesSinceResult,
  CollectionsSubscribeParams,
  CollectionsSubscribeResult,
  ComputeTargetRecord,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisExperimentLinkRecord,
  HypothesisRecord,
  MeasurementRecord,
  ProjectRecord,
  SessionRecord,
  TaskActivityRecord,
  TaskDependencyRecord,
  TaskEntityLinkRecord,
  TaskRecord,
  WorkspaceRecord,
} from "@situ/protocol";

export type SituCollectionName = CollectionUpsertedParams["collection"];

export type SituCollections = {
  workspaces: Collection<WorkspaceRecord, string>;
  projects: Collection<ProjectRecord, string>;
  sessions: Collection<SessionRecord, string>;
  hypotheses: Collection<HypothesisRecord, string>;
  baselines: Collection<BaselineRecord, string>;
  experiments: Collection<ExperimentRecord, string>;
  evaluations: Collection<EvaluationRecord, string>;
  measurements: Collection<MeasurementRecord, string>;
  analyses: Collection<AnalysisRecord, string>;
  hypothesisExperimentLinks: Collection<HypothesisExperimentLinkRecord, string>;
  agents: Collection<AgentRecord, string>;
  tasks: Collection<TaskRecord, string>;
  taskDependencies: Collection<TaskDependencyRecord, string>;
  taskEntityLinks: Collection<TaskEntityLinkRecord, string>;
  taskActivities: Collection<TaskActivityRecord, string>;
  analysisActivities: Collection<AnalysisActivityRecord, string>;
  hypothesisActivities: Collection<HypothesisActivityRecord, string>;
  baselineActivities: Collection<BaselineActivityRecord, string>;
  experimentActivities: Collection<ExperimentActivityRecord, string>;
  evaluationActivities: Collection<EvaluationActivityRecord, string>;
  artifacts: Collection<ArtifactRecord, string>;
  events: Collection<EventRecord, string>;
  computeTargets: Collection<ComputeTargetRecord, string>;
};

type ApplyBootstrapOptions = {
  collections: SituCollections;
  bootstrap: CollectionsBootstrapResult;
};

type ApplyCollectionUpsertOptions = {
  collections: SituCollections;
  upsert: CollectionUpsertedParams;
};

type ApplyCollectionDeleteOptions = {
  collections: SituCollections;
  change: CollectionChangeParams;
};

type CollectionSynchronizerOptions = {
  collections: SituCollections;
};

type HydrateCollectionOptions<T extends object> = {
  collection: Collection<T, string>;
  records: T[];
};

type LocalOnlyMutationTransaction = {
  mutations: Array<PendingMutation<Record<string, unknown>>>;
};

type LocalOnlySituCollection = Collection<object, string> & {
  utils: {
    acceptMutations: (transaction: LocalOnlyMutationTransaction) => void;
  };
};

type UpsertRecordOptions<T extends object> = {
  collection: Collection<T, string>;
  key: string;
  record: T;
};

type DeleteRecordOptions<T extends object> = {
  collection: Collection<T, string>;
  key: string;
};

export type CollectionSynchronizer = {
  applyBootstrap: (bootstrap: CollectionsBootstrapResult) => Promise<void>;
  applyChange: (change: CollectionChangeParams) => Promise<void>;
  applyChanges: (changes: CollectionChangeParams[]) => Promise<void>;
  applyUpsert: (upsert: CollectionUpsertedParams) => Promise<void>;
  cursor: () => number;
};

export type CollectionSyncClient = {
  request: <Result, Params>(request: {
    method: string;
    params: Params;
  }) => Promise<Result>;
  reconnectNotifications?: () => void;
};

type CollectionSyncOptions = {
  client: CollectionSyncClient;
  synchronizer: CollectionSynchronizer;
};

type RecoverCollectionSubscriptionOptions = CollectionSyncOptions & {
  reconnect?: boolean;
  resubscribe?: boolean;
};

export class CollectionCursorGapError extends Error {
  readonly expectedCursor: number;
  readonly actualCursor: number;

  constructor({
    expectedCursor,
    actualCursor,
  }: {
    expectedCursor: number;
    actualCursor: number;
  }) {
    super(`Collection cursor gap: expected ${expectedCursor}, received ${actualCursor}`);
    this.name = "CollectionCursorGapError";
    this.expectedCursor = expectedCursor;
    this.actualCursor = actualCursor;
  }
}

export function createSituCollections(): SituCollections {
  return {
    workspaces: createCollection(
      localOnlyCollectionOptions<WorkspaceRecord, string>({
        id: "situ-workspaces",
        getKey: (workspace) => workspace.id,
      }),
    ),
    projects: createCollection(
      localOnlyCollectionOptions<ProjectRecord, string>({
        id: "situ-projects",
        getKey: (project) => project.id,
      }),
    ),
    sessions: createCollection(
      localOnlyCollectionOptions<SessionRecord, string>({
        id: "situ-sessions",
        getKey: (session) => session.id,
      }),
    ),
    hypotheses: createCollection(
      localOnlyCollectionOptions<HypothesisRecord, string>({
        id: "situ-hypotheses",
        getKey: (hypothesis) => hypothesis.id,
      }),
    ),
    baselines: createCollection(
      localOnlyCollectionOptions<BaselineRecord, string>({
        id: "situ-baselines",
        getKey: (baseline) => baseline.id,
      }),
    ),
    experiments: createCollection(
      localOnlyCollectionOptions<ExperimentRecord, string>({
        id: "situ-experiments",
        getKey: (experiment) => experiment.id,
      }),
    ),
    evaluations: createCollection(
      localOnlyCollectionOptions<EvaluationRecord, string>({
        id: "situ-evaluations",
        getKey: (evaluation) => evaluation.id,
      }),
    ),
    measurements: createCollection(
      localOnlyCollectionOptions<MeasurementRecord, string>({
        id: "situ-measurements",
        getKey: (measurement) => String(measurement.id),
      }),
    ),
    analyses: createCollection(
      localOnlyCollectionOptions<AnalysisRecord, string>({
        id: "situ-analyses",
        getKey: (analysis) => analysis.id,
      }),
    ),
    hypothesisExperimentLinks: createCollection(
      localOnlyCollectionOptions<HypothesisExperimentLinkRecord, string>({
        id: "situ-hypothesis-experiment-links",
        getKey: (link) => `${link.hypothesis_id}:${link.experiment_id}`,
      }),
    ),
    agents: createCollection(
      localOnlyCollectionOptions<AgentRecord, string>({
        id: "situ-agents",
        getKey: (agent) => agent.id,
      }),
    ),
    tasks: createCollection(
      localOnlyCollectionOptions<TaskRecord, string>({
        id: "situ-tasks",
        getKey: (task) => task.id,
      }),
    ),
    taskDependencies: createCollection(
      localOnlyCollectionOptions<TaskDependencyRecord, string>({
        id: "situ-task-dependencies",
        getKey: (dependency) =>
          `${dependency.task_id}:${dependency.blocked_by_task_id}`,
      }),
    ),
    taskEntityLinks: createCollection(
      localOnlyCollectionOptions<TaskEntityLinkRecord, string>({
        id: "situ-task-entity-links",
        getKey: (link) =>
          `${link.task_id}:${link.entity_kind}:${link.entity_id}:${link.relationship}`,
      }),
    ),
    taskActivities: createCollection(
      localOnlyCollectionOptions<TaskActivityRecord, string>({
        id: "situ-task-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    analysisActivities: createCollection(
      localOnlyCollectionOptions<AnalysisActivityRecord, string>({
        id: "situ-analysis-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    hypothesisActivities: createCollection(
      localOnlyCollectionOptions<HypothesisActivityRecord, string>({
        id: "situ-hypothesis-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    baselineActivities: createCollection(
      localOnlyCollectionOptions<BaselineActivityRecord, string>({
        id: "situ-baseline-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    experimentActivities: createCollection(
      localOnlyCollectionOptions<ExperimentActivityRecord, string>({
        id: "situ-experiment-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    evaluationActivities: createCollection(
      localOnlyCollectionOptions<EvaluationActivityRecord, string>({
        id: "situ-evaluation-activities",
        getKey: (activity) => String(activity.id),
      }),
    ),
    artifacts: createCollection(
      localOnlyCollectionOptions<ArtifactRecord, string>({
        id: "situ-artifacts",
        getKey: (artifact) => artifact.id,
      }),
    ),
    events: createCollection(
      localOnlyCollectionOptions<EventRecord, string>({
        id: "situ-events",
        getKey: (event) => String(event.id),
      }),
    ),
    computeTargets: createCollection(
      localOnlyCollectionOptions<ComputeTargetRecord, string>({
        id: "situ-compute-targets",
        getKey: (target) => target.id,
      }),
    ),
  };
}

export function createCollectionSynchronizer({
  collections,
}: CollectionSynchronizerOptions): CollectionSynchronizer {
  let queue = Promise.resolve();
  let bootstrapped = false;
  let lastAppliedCursor = 0;
  const bufferedChanges: CollectionChangeParams[] = [];

  const enqueue = (work: () => Promise<void>): Promise<void> => {
    const run = queue.then(work, work);
    queue = run.catch(() => undefined);
    return run;
  };

  const applyFreshUpsert = async (upsert: CollectionUpsertedParams): Promise<void> => {
    if (upsert.cursor <= lastAppliedCursor) {
      return;
    }
    const expectedCursor = lastAppliedCursor + 1;
    if (upsert.cursor !== expectedCursor) {
      throw new CollectionCursorGapError({
        expectedCursor,
        actualCursor: upsert.cursor,
      });
    }

    await applyCollectionUpsert({ collections, upsert });
    lastAppliedCursor = upsert.cursor;
  };

  const applyFreshChange = async (change: CollectionChangeParams): Promise<void> => {
    if (change.cursor <= lastAppliedCursor) {
      return;
    }
    const expectedCursor = lastAppliedCursor + 1;
    if (change.cursor !== expectedCursor) {
      throw new CollectionCursorGapError({
        expectedCursor,
        actualCursor: change.cursor,
      });
    }

    if (change.op === "delete") {
      await applyCollectionDelete({ collections, change });
      lastAppliedCursor = change.cursor;
      return;
    }

    if (!change.record) {
      throw new Error(
        `Collection upsert ${change.collection}:${change.key} is missing a record`,
      );
    }

    await applyCollectionUpsert({
      collections,
      upsert: {
        cursor: change.cursor,
        collection: change.collection,
        key: change.key,
        record: change.record,
        source_event_id: change.source_event_id,
      },
    });
    lastAppliedCursor = change.cursor;
  };

  return {
    applyBootstrap: (bootstrap) =>
      enqueue(async () => {
        await applyBootstrap({ collections, bootstrap });
        lastAppliedCursor = bootstrap.cursor;
        bootstrapped = true;

        const pending = bufferedChanges.splice(0).sort((left, right) => left.cursor - right.cursor);
        for (const change of pending) {
          await applyFreshChange(change);
        }
      }),

    applyChange: (change) => {
      if (!bootstrapped) {
        bufferedChanges.push(change);
        return Promise.resolve();
      }

      return enqueue(() => applyFreshChange(change));
    },

    applyChanges: (changes) =>
      enqueue(async () => {
        for (const change of [...changes].sort((left, right) => left.cursor - right.cursor)) {
          await applyFreshChange(change);
        }
      }),

    applyUpsert: (upsert) => {
      if (!bootstrapped) {
        bufferedChanges.push({
          cursor: upsert.cursor,
          collection: upsert.collection,
          key: upsert.key,
          op: "upsert",
          record: upsert.record,
          source_event_id: upsert.source_event_id,
        });
        return Promise.resolve();
      }

      return enqueue(() => applyFreshUpsert(upsert));
    },

    cursor: () => lastAppliedCursor,
  };
}

export function isCollectionCursorGapError(
  error: unknown,
): error is CollectionCursorGapError {
  return error instanceof CollectionCursorGapError;
}

export async function bootstrapCollectionSync({
  client,
  synchronizer,
}: CollectionSyncOptions): Promise<CollectionsBootstrapResult> {
  await client.request<CollectionsSubscribeResult, CollectionsSubscribeParams>({
    method: "collections.subscribe",
    params: {},
  });
  const bootstrap = await client.request<
    CollectionsBootstrapResult,
    CollectionsBootstrapParams
  >({
    method: "collections.bootstrap",
    params: {},
  });
  try {
    await synchronizer.applyBootstrap(bootstrap);
  } catch (error) {
    if (!isCollectionCursorGapError(error)) {
      throw error;
    }
    await recoverCollectionChanges({ client, synchronizer });
  }
  await recoverCollectionChanges({ client, synchronizer });
  return bootstrap;
}

export async function recoverCollectionSubscription({
  client,
  synchronizer,
  reconnect = false,
  resubscribe = true,
}: RecoverCollectionSubscriptionOptions): Promise<void> {
  if (reconnect) {
    client.reconnectNotifications?.();
  }
  if (resubscribe) {
    await client.request<CollectionsSubscribeResult, CollectionsSubscribeParams>({
      method: "collections.subscribe",
      params: {},
    });
  }
  await recoverCollectionChanges({ client, synchronizer });
}

export async function recoverCollectionChanges({
  client,
  synchronizer,
}: CollectionSyncOptions): Promise<void> {
  for (;;) {
    const result = await client.request<
      CollectionsChangesSinceResult,
      CollectionsChangesSinceParams
    >({
      method: "collections.changes_since",
      params: { cursor: synchronizer.cursor() },
    });

    if (result.reset_required) {
      const bootstrap = await client.request<
        CollectionsBootstrapResult,
        CollectionsBootstrapParams
      >({
        method: "collections.bootstrap",
        params: {},
      });
      await synchronizer.applyBootstrap(bootstrap);
      continue;
    }

    await synchronizer.applyChanges(result.changes);
    if (!result.has_more) {
      return;
    }
  }
}

export async function applyBootstrap({
  collections,
  bootstrap,
}: ApplyBootstrapOptions): Promise<void> {
  await preloadCollections(collections);

  const transaction = createTransaction<Record<string, unknown>>({
    autoCommit: false,
    mutationFn: async ({ transaction }) => {
      for (const collection of localOnlyCollections(collections)) {
        collection.utils.acceptMutations(transaction);
      }
    },
  });

  transaction.mutate(() => {
    hydrateCollection({
      collection: collections.workspaces,
      records: bootstrap.workspaces ?? [],
    });
    hydrateCollection({
      collection: collections.projects,
      records: bootstrap.projects ?? [],
    });
    hydrateCollection({
      collection: collections.sessions,
      records: bootstrap.sessions ?? [],
    });
    hydrateCollection({
      collection: collections.hypotheses,
      records: bootstrap.hypotheses ?? [],
    });
    hydrateCollection({
      collection: collections.baselines,
      records: bootstrap.baselines ?? [],
    });
    hydrateCollection({
      collection: collections.experiments,
      records: bootstrap.experiments ?? [],
    });
    hydrateCollection({
      collection: collections.evaluations,
      records: bootstrap.evaluations ?? [],
    });
    hydrateCollection({
      collection: collections.measurements,
      records: bootstrap.measurements ?? [],
    });
    hydrateCollection({
      collection: collections.analyses,
      records: bootstrap.analyses ?? [],
    });
    hydrateCollection({
      collection: collections.hypothesisExperimentLinks,
      records: bootstrap.hypothesis_experiment_links ?? [],
    });
    hydrateCollection({
      collection: collections.agents,
      records: bootstrap.agents ?? [],
    });
    hydrateCollection({
      collection: collections.tasks,
      records: bootstrap.tasks ?? [],
    });
    hydrateCollection({
      collection: collections.taskDependencies,
      records: bootstrap.task_dependencies ?? [],
    });
    hydrateCollection({
      collection: collections.taskEntityLinks,
      records: bootstrap.task_entity_links ?? [],
    });
    hydrateCollection({
      collection: collections.taskActivities,
      records: bootstrap.task_activities ?? [],
    });
    hydrateCollection({
      collection: collections.analysisActivities,
      records: bootstrap.analysis_activities ?? [],
    });
    hydrateCollection({
      collection: collections.hypothesisActivities,
      records: bootstrap.hypothesis_activities ?? [],
    });
    hydrateCollection({
      collection: collections.baselineActivities,
      records: bootstrap.baseline_activities ?? [],
    });
    hydrateCollection({
      collection: collections.experimentActivities,
      records: bootstrap.experiment_activities ?? [],
    });
    hydrateCollection({
      collection: collections.evaluationActivities,
      records: bootstrap.evaluation_activities ?? [],
    });
    hydrateCollection({
      collection: collections.artifacts,
      records: bootstrap.artifacts ?? [],
    });
    hydrateCollection({
      collection: collections.events,
      records: bootstrap.events ?? [],
    });
    hydrateCollection({
      collection: collections.computeTargets,
      records: bootstrap.compute_targets ?? [],
    });
  });

  await transaction.commit();
}

export async function applyCollectionUpsert({
  collections,
  upsert,
}: ApplyCollectionUpsertOptions): Promise<void> {
  if (upsert.collection === "workspaces") {
    await upsertRecord({
      collection: collections.workspaces,
      key: upsert.key,
      record: upsert.record as unknown as WorkspaceRecord,
    });
    return;
  }

  if (upsert.collection === "projects") {
    await upsertRecord({
      collection: collections.projects,
      key: upsert.key,
      record: upsert.record as unknown as ProjectRecord,
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

  if (upsert.collection === "baselines") {
    await upsertRecord({
      collection: collections.baselines,
      key: upsert.key,
      record: upsert.record as unknown as BaselineRecord,
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

  if (upsert.collection === "measurements") {
    await upsertRecord({
      collection: collections.measurements,
      key: upsert.key,
      record: upsert.record as unknown as MeasurementRecord,
    });
    return;
  }

  if (upsert.collection === "analyses") {
    await upsertRecord({
      collection: collections.analyses,
      key: upsert.key,
      record: upsert.record as unknown as AnalysisRecord,
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

  if (upsert.collection === "agents") {
    await upsertRecord({
      collection: collections.agents,
      key: upsert.key,
      record: upsert.record as unknown as AgentRecord,
    });
    return;
  }

  if (upsert.collection === "tasks") {
    await upsertRecord({
      collection: collections.tasks,
      key: upsert.key,
      record: upsert.record as unknown as TaskRecord,
    });
    return;
  }

  if (upsert.collection === "task_dependencies") {
    await upsertRecord({
      collection: collections.taskDependencies,
      key: upsert.key,
      record: upsert.record as unknown as TaskDependencyRecord,
    });
    return;
  }

  if (upsert.collection === "task_entity_links") {
    await upsertRecord({
      collection: collections.taskEntityLinks,
      key: upsert.key,
      record: upsert.record as unknown as TaskEntityLinkRecord,
    });
    return;
  }

  if (upsert.collection === "task_activities") {
    await upsertRecord({
      collection: collections.taskActivities,
      key: upsert.key,
      record: upsert.record as unknown as TaskActivityRecord,
    });
    return;
  }

  if (upsert.collection === "analysis_activities") {
    await upsertRecord({
      collection: collections.analysisActivities,
      key: upsert.key,
      record: upsert.record as unknown as AnalysisActivityRecord,
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

  if (upsert.collection === "baseline_activities") {
    await upsertRecord({
      collection: collections.baselineActivities,
      key: upsert.key,
      record: upsert.record as unknown as BaselineActivityRecord,
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

  if (upsert.collection === "events") {
    await upsertRecord({
      collection: collections.events,
      key: upsert.key,
      record: upsert.record as unknown as EventRecord,
    });
    return;
  }

  if (upsert.collection === "compute_targets") {
    await upsertRecord({
      collection: collections.computeTargets,
      key: upsert.key,
      record: upsert.record as unknown as ComputeTargetRecord,
    });
    return;
  }

  const unsupportedCollection: never = upsert.collection;
  throw new Error(`Unsupported Situ collection: ${unsupportedCollection}`);
}

export async function applyCollectionDelete({
  collections,
  change,
}: ApplyCollectionDeleteOptions): Promise<void> {
  await deleteRecord({
    collection: collectionForName({
      collections,
      name: change.collection,
    }),
    key: change.key,
  });
}

function hydrateCollection<T extends object>({
  collection,
  records,
}: HydrateCollectionOptions<T>): void {
  const nextKeys = new Set(records.map((record) => collection.config.getKey(record)));

  for (const record of records) {
    upsertRecordInTransaction({
      collection,
      key: collection.config.getKey(record),
      record,
    });
  }

  for (const key of [...collection.keys()]) {
    if (!nextKeys.has(key)) {
      deleteRecordInTransaction({ collection, key });
    }
  }
}

function collectionForName({
  collections,
  name,
}: {
  collections: SituCollections;
  name: SituCollectionName;
}): Collection<object, string> {
  if (name === "workspaces") return collections.workspaces as unknown as Collection<object, string>;
  if (name === "projects") return collections.projects as unknown as Collection<object, string>;
  if (name === "sessions") return collections.sessions as unknown as Collection<object, string>;
  if (name === "hypotheses") return collections.hypotheses as unknown as Collection<object, string>;
  if (name === "baselines") return collections.baselines as unknown as Collection<object, string>;
  if (name === "experiments") return collections.experiments as unknown as Collection<object, string>;
  if (name === "evaluations") return collections.evaluations as unknown as Collection<object, string>;
  if (name === "measurements") return collections.measurements as unknown as Collection<object, string>;
  if (name === "analyses") return collections.analyses as unknown as Collection<object, string>;
  if (name === "hypothesis_experiment_links") {
    return collections.hypothesisExperimentLinks as unknown as Collection<object, string>;
  }
  if (name === "agents") return collections.agents as unknown as Collection<object, string>;
  if (name === "tasks") return collections.tasks as unknown as Collection<object, string>;
  if (name === "task_dependencies") {
    return collections.taskDependencies as unknown as Collection<object, string>;
  }
  if (name === "task_entity_links") {
    return collections.taskEntityLinks as unknown as Collection<object, string>;
  }
  if (name === "task_activities") {
    return collections.taskActivities as unknown as Collection<object, string>;
  }
  if (name === "analysis_activities") {
    return collections.analysisActivities as unknown as Collection<object, string>;
  }
  if (name === "hypothesis_activities") {
    return collections.hypothesisActivities as unknown as Collection<object, string>;
  }
  if (name === "baseline_activities") {
    return collections.baselineActivities as unknown as Collection<object, string>;
  }
  if (name === "experiment_activities") {
    return collections.experimentActivities as unknown as Collection<object, string>;
  }
  if (name === "evaluation_activities") {
    return collections.evaluationActivities as unknown as Collection<object, string>;
  }
  if (name === "artifacts") return collections.artifacts as unknown as Collection<object, string>;
  if (name === "events") return collections.events as unknown as Collection<object, string>;
  if (name === "compute_targets") {
    return collections.computeTargets as unknown as Collection<object, string>;
  }

  const unsupportedCollection: never = name;
  throw new Error(`Unsupported Situ collection: ${unsupportedCollection}`);
}

async function upsertRecord<T extends object>({
  collection,
  key,
  record,
}: UpsertRecordOptions<T>): Promise<void> {
  await collection.preload();

  const transaction = upsertRecordInTransaction({ collection, key, record });
  await persist({ transaction });
}

function upsertRecordInTransaction<T extends object>({
  collection,
  key,
  record,
}: UpsertRecordOptions<T>): Transaction {
  if (collection.has(key)) {
    return collection.update(key, (draft) => {
      Object.assign(draft, record);
    });
  }

  return collection.insert(record);
}

async function deleteRecord<T extends object>({
  collection,
  key,
}: DeleteRecordOptions<T>): Promise<void> {
  await collection.preload();

  if (!collection.has(key)) {
    return;
  }

  const transaction = deleteRecordInTransaction({ collection, key });
  await persist({ transaction });
}

function deleteRecordInTransaction<T extends object>({
  collection,
  key,
}: DeleteRecordOptions<T>): Transaction {
  return collection.delete(key);
}

async function preloadCollections(collections: SituCollections): Promise<void> {
  await Promise.all(localOnlyCollections(collections).map((collection) => collection.preload()));
}

function localOnlyCollections(collections: SituCollections): LocalOnlySituCollection[] {
  return [
    collections.workspaces,
    collections.projects,
    collections.sessions,
    collections.hypotheses,
    collections.baselines,
    collections.experiments,
    collections.evaluations,
    collections.measurements,
    collections.analyses,
    collections.hypothesisExperimentLinks,
    collections.agents,
    collections.tasks,
    collections.taskDependencies,
    collections.taskEntityLinks,
    collections.taskActivities,
    collections.analysisActivities,
    collections.hypothesisActivities,
    collections.baselineActivities,
    collections.experimentActivities,
    collections.evaluationActivities,
    collections.artifacts,
    collections.events,
    collections.computeTargets,
  ].map((collection) => collection as unknown as LocalOnlySituCollection);
}

async function persist({ transaction }: { transaction: Transaction }): Promise<void> {
  await transaction.isPersisted.promise;
}
