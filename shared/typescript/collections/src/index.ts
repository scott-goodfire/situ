import {
  createCollection,
  localOnlyCollectionOptions,
  type Collection,
  type Transaction,
} from "@tanstack/db";
import type {
  AgentRecord,
  AnalysisActivityRecord,
  AnalysisRecord,
  ArtifactRecord,
  BaselineRecord,
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
  experimentActivities: Collection<ExperimentActivityRecord, string>;
  evaluationActivities: Collection<EvaluationActivityRecord, string>;
  artifacts: Collection<ArtifactRecord, string>;
  events: Collection<EventRecord, string>;
};

type ApplyBootstrapOptions = {
  collections: SituCollections;
  bootstrap: CollectionsBootstrapResult;
};

type ApplyCollectionUpsertOptions = {
  collections: SituCollections;
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
  };
}

export async function applyBootstrap({
  collections,
  bootstrap,
}: ApplyBootstrapOptions): Promise<void> {
  await Promise.all([
    hydrateCollection({
      collection: collections.workspaces,
      records: bootstrap.workspaces ?? [],
    }),
    hydrateCollection({
      collection: collections.projects,
      records: bootstrap.projects ?? [],
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
      collection: collections.baselines,
      records: bootstrap.baselines ?? [],
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
      collection: collections.measurements,
      records: bootstrap.measurements ?? [],
    }),
    hydrateCollection({
      collection: collections.analyses,
      records: bootstrap.analyses ?? [],
    }),
    hydrateCollection({
      collection: collections.hypothesisExperimentLinks,
      records: bootstrap.hypothesis_experiment_links ?? [],
    }),
    hydrateCollection({
      collection: collections.agents,
      records: bootstrap.agents ?? [],
    }),
    hydrateCollection({
      collection: collections.tasks,
      records: bootstrap.tasks ?? [],
    }),
    hydrateCollection({
      collection: collections.taskDependencies,
      records: bootstrap.task_dependencies ?? [],
    }),
    hydrateCollection({
      collection: collections.taskEntityLinks,
      records: bootstrap.task_entity_links ?? [],
    }),
    hydrateCollection({
      collection: collections.taskActivities,
      records: bootstrap.task_activities ?? [],
    }),
    hydrateCollection({
      collection: collections.analysisActivities,
      records: bootstrap.analysis_activities ?? [],
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

  const unsupportedCollection: never = upsert.collection;
  throw new Error(`Unsupported Situ collection: ${unsupportedCollection}`);
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
