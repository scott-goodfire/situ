import { describe, expect, test } from "bun:test";
import {
  applyBootstrap,
  applyCollectionUpsert,
  bootstrapCollectionSync,
  CollectionCursorGapError,
  type CollectionSyncClient,
  createCollectionSynchronizer,
  createSituCollections,
  recoverCollectionChanges,
  recoverCollectionSubscription,
} from "./index";
import type {
  AgentRecord,
  AnalysisActivityRecord,
  AnalysisRecord,
  BaselineRecord,
  CollectionChangeParams,
  CollectionUpsertedParams,
  CollectionsBootstrapResult,
  CollectionsChangesSinceResult,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
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

const WORKSPACE_ID = "workspace_0001";
const PROJECT_ID = "P1";
const SESSION_ID = "S1";

describe("situ collections", () => {
  test("hydrates workspaces, projects, sessions, activities, and events", async () => {
    const collections = createSituCollections();
    const bootstrap: CollectionsBootstrapResult = {
      cursor: 2,
      workspaces: [workspaceRecord({})],
      projects: [projectRecord({})],
      sessions: [sessionRecord({ overrides: { id: SESSION_ID } })],
      hypotheses: [hypothesisRecord({})],
      baselines: [baselineRecord({})],
      experiments: [experimentRecord({})],
      evaluations: [evaluationRecord({})],
      measurements: [measurementRecord({})],
      analyses: [analysisRecord({})],
      hypothesis_experiment_links: [
        {
          hypothesis_id: "H1",
          experiment_id: "EX1",
          created_at: "2026-01-01T00:00:01Z",
        },
      ],
      agents: [agentRecord({})],
      tasks: [taskRecord({})],
      task_dependencies: [taskDependencyRecord({})],
      task_entity_links: [taskEntityLinkRecord({})],
      task_activities: [taskActivityRecord({})],
      analysis_activities: [analysisActivityRecord({})],
      hypothesis_activities: [],
      experiment_activities: [experimentActivityRecord({})],
      evaluation_activities: [evaluationActivityRecord({})],
      artifacts: [],
      events: [
        eventRecord({
          overrides: { id: 1, type: "session.started" },
        }),
        eventRecord({
          overrides: { id: 2, type: "experiment.completed" },
        }),
      ],
    };

    await applyBootstrap({
      collections,
      bootstrap,
    });

    expect(collections.workspaces.get(WORKSPACE_ID)?.repo_path).toBe("/tmp/repo");
    expect(collections.projects.get(PROJECT_ID)?.objective).toBe("Improve score.");
    expect(collections.projects.get(PROJECT_ID)?.research_context).toBe(
      "Run project-native tests and collect plaintext evidence.",
    );
    expect(collections.sessions.get(SESSION_ID)?.status).toBe("active");
    expect(collections.hypotheses.get("H1")?.status).toBe("active");
    expect(collections.baselines.get("B1")?.status).toBe(
      "closed",
    );
    expect(collections.experiments.get("EX1")?.status).toBe(
      "closed",
    );
    expect(collections.evaluations.get("EV1")?.status).toBe(
      "closed",
    );
    expect(collections.analyses.get("A1")?.status).toBe("open");
    expect(collections.agents.get("agent_P1_scientist")?.kind).toBe(
      "scientist",
    );
    expect(collections.tasks.get("T1")?.kind).toBe("baseline");
    expect(collections.taskDependencies.get("T2:T1")?.blocked_by_task_id).toBe(
      "T1",
    );
    expect(collections.taskEntityLinks.get("T1:evaluation:EV1:created")?.entity_id).toBe(
      "EV1",
    );
    expect(collections.taskActivities.get("1")?.task_id).toBe("T1");
    expect(collections.analysisActivities.get("1")?.kind).toBe("comment");
    expect(collections.experimentActivities.get("1")?.kind).toBe("comment");
    expect(collections.evaluationActivities.get("1")?.kind).toBe("result");
    expect(collections.measurements.get("M1")?.payload.activity_type).toBe("result");
    expect(collections.events.get("1")?.type).toBe("session.started");
    expect(collections.events.get("2")?.type).toBe("experiment.completed");
  });

  test("handles bootstrap payloads from sessions missing newer collections", async () => {
    const collections = createSituCollections();
    const bootstrap = {
      cursor: 1,
      projects: [projectRecord({})],
      sessions: [],
      hypotheses: [],
      experiments: [],
      hypothesis_experiment_links: [],
      hypothesis_activities: [],
      experiment_activities: [],
      artifacts: [],
      events: [],
    } as unknown as CollectionsBootstrapResult;

    await applyBootstrap({
      collections,
      bootstrap,
    });

    expect(collections.projects.get(PROJECT_ID)?.objective).toBe("Improve score.");
    expect(collections.workspaces.size).toBe(0);
    expect(collections.baselines.size).toBe(0);
    expect(collections.evaluations.size).toBe(0);
    expect(collections.measurements.size).toBe(0);
    expect(collections.analyses.size).toBe(0);
    expect(collections.analysisActivities.size).toBe(0);
    expect(collections.evaluationActivities.size).toBe(0);
  });

  test("bootstrap replacement does not expose an empty intermediate collection", async () => {
    const collections = createSituCollections();

    await applyBootstrap({
      collections,
      bootstrap: bootstrapResult({
        cursor: 1,
        projects: [projectRecord({})],
      }),
    });

    const observedProjectSizes: number[] = [];
    const subscription = collections.projects.subscribeChanges(
      () => {
        observedProjectSizes.push(collections.projects.size);
      },
      { includeInitialState: false },
    );

    await applyBootstrap({
      collections,
      bootstrap: bootstrapResult({
        cursor: 2,
        projects: [projectRecord({ overrides: { id: "P2" } })],
      }),
    });

    subscription.unsubscribe();

    expect([...collections.projects.keys()]).toEqual(["P2"]);
    expect(observedProjectSizes.length).toBeGreaterThan(0);
    expect(observedProjectSizes).not.toContain(0);
  });

  test("applies collection upserts as inserts and updates", async () => {
    const collections = createSituCollections();

    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "workspaces",
        key: WORKSPACE_ID,
        record: workspaceRecord({ overrides: { id: WORKSPACE_ID } }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "projects",
        key: PROJECT_ID,
        record: projectRecord({ overrides: { id: PROJECT_ID } }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "sessions",
        key: SESSION_ID,
        record: sessionRecord({ overrides: { id: SESSION_ID, status: "active" } }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "sessions",
        key: SESSION_ID,
        record: sessionRecord({ overrides: { id: SESSION_ID, status: "closed" } }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "baselines",
        key: "B1",
        record: baselineRecord({
          overrides: { id: "B1", status: "active" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "experiments",
        key: "EX1",
        record: experimentRecord({
          overrides: { id: "EX1", status: "active" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "evaluations",
        key: "EV2",
        record: evaluationRecord({
          overrides: { id: "EV2", status: "active" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "measurements",
        key: "M6",
        record: measurementRecord({
          overrides: {
            id: "M6",
            payload: { activity_type: "result", metrics: { score: { value: 0.73 } } },
          },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "analyses",
        key: "A1",
        record: analysisRecord({
          overrides: { id: "A1", status: "active" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "agents",
        key: "agent_P1_scientist",
        record: agentRecord({}),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "tasks",
        key: "T1",
        record: taskRecord({}),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "task_activities",
        key: "1",
        record: taskActivityRecord({}),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "experiment_activities",
        key: "3",
        record: experimentActivityRecord({
          overrides: {
            id: 3,
            payload: { activity_type: "concern" },
          },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "evaluation_activities",
        key: "4",
        record: evaluationActivityRecord({
          overrides: {
            id: 4,
            payload: { activity_type: "result" },
          },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "analysis_activities",
        key: "5",
        record: analysisActivityRecord({
          overrides: {
            id: 5,
            payload: { source: "first pass" },
          },
        }),
      }),
    });

    expect(collections.workspaces.get(WORKSPACE_ID)?.repo_path).toBe("/tmp/repo");
    expect(collections.projects.get(PROJECT_ID)?.research_context).toBe(
      "Run project-native tests and collect plaintext evidence.",
    );
    expect(collections.sessions.size).toBe(1);
    expect(collections.sessions.get(SESSION_ID)?.status).toBe("closed");
    expect(collections.baselines.get("B1")?.status).toBe(
      "active",
    );
    expect(collections.experiments.get("EX1")?.status).toBe("active");
    expect(collections.evaluations.get("EV2")?.status).toBe("active");
    expect(collections.measurements.get("M6")?.payload.metrics).toEqual({
      score: { value: 0.73 },
    });
    expect(collections.analyses.get("A1")?.status).toBe("active");
    expect(collections.agents.get("agent_P1_scientist")?.status).toBe("idle");
    expect(collections.tasks.get("T1")?.priority).toBe("high");
    expect(collections.taskActivities.get("1")?.actor_agent_id).toBe(
      "agent_P1_scientist",
    );
    expect(collections.analysisActivities.get("5")?.payload.source).toBe("first pass");
    expect(collections.experimentActivities.get("3")?.kind).toBe("comment");
    expect(collections.experimentActivities.get("3")?.payload.activity_type).toBe(
      "concern",
    );
    expect(collections.evaluationActivities.get("4")?.payload.activity_type).toBe(
      "result",
    );
  });

  test("synchronizer keeps bootstrap state over older buffered upserts", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });

    await sync.applyUpsert(
      upsert({
        cursor: 1,
        collection: "tasks",
        key: "T1",
        record: taskRecord({ overrides: { status: "backlog" } }),
      }),
    );
    await sync.applyBootstrap(
      bootstrapResult({
        cursor: 2,
        tasks: [
          taskRecord({
            overrides: {
              status: "in_progress",
              claimed_at: "2026-01-01T00:00:02Z",
            },
          }),
        ],
      }),
    );

    expect(collections.tasks.get("T1")?.status).toBe("in_progress");
  });

  test("synchronizer replays newer buffered upserts after bootstrap", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });

    await sync.applyUpsert(
      upsert({
        cursor: 3,
        collection: "tasks",
        key: "T1",
        record: taskRecord({
          overrides: {
            status: "in_progress",
            claimed_at: "2026-01-01T00:00:03Z",
          },
        }),
      }),
    );
    await sync.applyBootstrap(
      bootstrapResult({
        cursor: 2,
        tasks: [taskRecord({ overrides: { status: "backlog" } })],
      }),
    );

    expect(collections.tasks.get("T1")?.status).toBe("in_progress");
  });

  test("synchronizer ignores stale upserts after newer task state", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });

    await sync.applyBootstrap(bootstrapResult({ cursor: 1 }));
    await sync.applyUpsert(
      upsert({
        cursor: 2,
        collection: "tasks",
        key: "T1",
        record: taskRecord({
          overrides: {
            status: "in_progress",
            claimed_at: "2026-01-01T00:00:02Z",
          },
        }),
      }),
    );
    await sync.applyUpsert(
      upsert({
        cursor: 1,
        collection: "tasks",
        key: "T1",
        record: taskRecord({ overrides: { status: "backlog" } }),
      }),
    );

    expect(collections.tasks.get("T1")?.status).toBe("in_progress");
  });

  test("synchronizer reports cursor gaps for missed live upserts", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });

    await sync.applyBootstrap(bootstrapResult({ cursor: 0 }));

    await expect(
      sync.applyUpsert(
        upsert({
          cursor: 2,
          collection: "tasks",
          key: "T1",
          record: taskRecord({ overrides: { status: "in_progress" } }),
        }),
      ),
    ).rejects.toBeInstanceOf(CollectionCursorGapError);
  });

  test("synchronizer applies replayed changes in cursor order", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });

    await sync.applyBootstrap(bootstrapResult({ cursor: 0 }));
    await sync.applyChanges([
      change({
        cursor: 2,
        collection: "tasks",
        key: "T1",
        record: taskRecord({
          overrides: {
            status: "in_progress",
            claimed_at: "2026-01-01T00:00:02Z",
          },
        }),
      }),
      change({
        cursor: 1,
        collection: "tasks",
        key: "T1",
        record: taskRecord({ overrides: { status: "backlog" } }),
      }),
    ]);

    expect(collections.tasks.get("T1")?.status).toBe("in_progress");
    expect(sync.cursor()).toBe(2);
  });

  test("synchronizer serializes same-record live upserts", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });

    await sync.applyBootstrap(bootstrapResult({ cursor: 0 }));
    const backlog = sync.applyUpsert(
      upsert({
        cursor: 1,
        collection: "tasks",
        key: "T1",
        record: taskRecord({ overrides: { status: "backlog" } }),
      }),
    );
    const inProgress = sync.applyUpsert(
      upsert({
        cursor: 2,
        collection: "tasks",
        key: "T1",
        record: taskRecord({
          overrides: {
            status: "in_progress",
            claimed_at: "2026-01-01T00:00:02Z",
          },
        }),
      }),
    );

    await Promise.all([inProgress, backlog]);

    expect(collections.tasks.get("T1")?.status).toBe("in_progress");
  });

  test("startup subscribes, bootstraps once, then replays durable changes", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });
    const client = new FakeCollectionSyncClient([
      {
        method: "collections.subscribe",
        result: { subscribed: true, cursor: 0 },
      },
      {
        method: "collections.bootstrap",
        result: bootstrapResult({
          cursor: 0,
          projects: [projectRecord({})],
          tasks: [taskRecord({ overrides: { status: "backlog" } })],
        }),
      },
      {
        method: "collections.changes_since",
        result: changesResult({
          cursor: 1,
          changes: [
            change({
              cursor: 1,
              collection: "tasks",
              key: "T1",
              record: taskRecord({ overrides: { status: "in_progress" } }),
            }),
          ],
        }),
      },
    ]);

    const bootstrap = await bootstrapCollectionSync({
      client,
      synchronizer: sync,
    });

    expect(bootstrap.cursor).toBe(0);
    expect(client.methods()).toEqual([
      "collections.subscribe",
      "collections.bootstrap",
      "collections.changes_since",
    ]);
    expect(client.calls[2]?.params).toEqual({ cursor: 0 });
    expect(collections.tasks.get("T1")?.status).toBe("in_progress");
    expect(sync.cursor()).toBe(1);
  });

  test("periodic recovery replays changes without bootstrapping", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });
    await sync.applyBootstrap(
      bootstrapResult({
        cursor: 1,
        tasks: [taskRecord({ overrides: { status: "backlog" } })],
      }),
    );
    const client = new FakeCollectionSyncClient([
      {
        method: "collections.changes_since",
        result: changesResult({
          cursor: 2,
          changes: [
            change({
              cursor: 2,
              collection: "tasks",
              key: "T1",
              record: taskRecord({ overrides: { status: "in_progress" } }),
            }),
          ],
        }),
      },
    ]);

    await recoverCollectionSubscription({
      client,
      synchronizer: sync,
      resubscribe: false,
    });

    expect(client.methods()).toEqual(["collections.changes_since"]);
    expect(client.calls[0]?.params).toEqual({ cursor: 1 });
    expect(collections.tasks.get("T1")?.status).toBe("in_progress");
    expect(sync.cursor()).toBe(2);
  });

  test("reset-required recovery bootstraps then resumes replay from the reset cursor", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });
    await sync.applyBootstrap(
      bootstrapResult({
        cursor: 5,
        tasks: [taskRecord({ overrides: { status: "backlog" } })],
      }),
    );
    const client = new FakeCollectionSyncClient([
      {
        method: "collections.changes_since",
        result: changesResult({ cursor: 5, resetRequired: true }),
      },
      {
        method: "collections.bootstrap",
        result: bootstrapResult({
          cursor: 10,
          tasks: [taskRecord({ overrides: { status: "done" } })],
        }),
      },
      {
        method: "collections.changes_since",
        result: changesResult({ cursor: 10 }),
      },
    ]);

    await recoverCollectionChanges({
      client,
      synchronizer: sync,
    });

    expect(client.methods()).toEqual([
      "collections.changes_since",
      "collections.bootstrap",
      "collections.changes_since",
    ]);
    expect(client.calls[0]?.params).toEqual({ cursor: 5 });
    expect(client.calls[2]?.params).toEqual({ cursor: 10 });
    expect(collections.tasks.get("T1")?.status).toBe("done");
    expect(sync.cursor()).toBe(10);
  });

  test("notification cursor gaps recover by replay without bootstrap", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });
    await sync.applyBootstrap(bootstrapResult({ cursor: 0 }));
    await expect(
      sync.applyUpsert(
        upsert({
          cursor: 2,
          collection: "tasks",
          key: "T1",
          record: taskRecord({ overrides: { status: "in_progress" } }),
        }),
      ),
    ).rejects.toBeInstanceOf(CollectionCursorGapError);
    const client = new FakeCollectionSyncClient([
      {
        method: "collections.subscribe",
        result: { subscribed: true, cursor: 2 },
      },
      {
        method: "collections.changes_since",
        result: changesResult({
          cursor: 2,
          changes: [
            change({
              cursor: 1,
              collection: "tasks",
              key: "T1",
              record: taskRecord({ overrides: { status: "backlog" } }),
            }),
            change({
              cursor: 2,
              collection: "tasks",
              key: "T1",
              record: taskRecord({ overrides: { status: "in_progress" } }),
            }),
          ],
        }),
      },
    ]);

    await recoverCollectionSubscription({
      client,
      synchronizer: sync,
    });

    expect(client.methods()).toEqual([
      "collections.subscribe",
      "collections.changes_since",
    ]);
    expect(collections.tasks.get("T1")?.status).toBe("in_progress");
    expect(sync.cursor()).toBe(2);
  });

  test("reconnect recovery reconnects notifications and replays without bootstrap", async () => {
    const collections = createSituCollections();
    const sync = createCollectionSynchronizer({ collections });
    await sync.applyBootstrap(bootstrapResult({ cursor: 3 }));
    const client = new FakeCollectionSyncClient([
      {
        method: "collections.subscribe",
        result: { subscribed: true, cursor: 3 },
      },
      {
        method: "collections.changes_since",
        result: changesResult({ cursor: 3 }),
      },
    ]);

    await recoverCollectionSubscription({
      client,
      synchronizer: sync,
      reconnect: true,
    });

    expect(client.reconnectCount).toBe(1);
    expect(client.methods()).toEqual([
      "collections.subscribe",
      "collections.changes_since",
    ]);
  });
});

type FakeResponse = {
  method: string;
  result: unknown;
};

class FakeCollectionSyncClient implements CollectionSyncClient {
  readonly calls: Array<{ method: string; params: unknown }> = [];
  reconnectCount = 0;

  constructor(private readonly responses: FakeResponse[]) {}

  async request<Result, Params>({
    method,
    params,
  }: {
    method: string;
    params: Params;
  }): Promise<Result> {
    this.calls.push({ method, params });
    const response = this.responses.shift();
    expect(response?.method).toBe(method);
    return response?.result as Result;
  }

  reconnectNotifications(): void {
    this.reconnectCount += 1;
  }

  methods(): string[] {
    return this.calls.map((call) => call.method);
  }
}

function upsert({
  cursor = 1,
  collection,
  key,
  record,
}: {
  cursor?: number;
  collection: CollectionUpsertedParams["collection"];
  key: string;
  record:
    | WorkspaceRecord
    | ProjectRecord
    | SessionRecord
    | HypothesisRecord
    | BaselineRecord
    | ExperimentRecord
    | EvaluationRecord
    | MeasurementRecord
    | AnalysisRecord
    | AgentRecord
    | TaskRecord
    | TaskDependencyRecord
    | TaskEntityLinkRecord
    | TaskActivityRecord
    | AnalysisActivityRecord
    | ExperimentActivityRecord
    | EvaluationActivityRecord
    | EventRecord;
}): CollectionUpsertedParams {
  return {
    cursor,
    collection,
    key,
    record: record as unknown as Record<string, unknown>,
  };
}

function change({
  cursor = 1,
  collection,
  key,
  record,
}: {
  cursor?: number;
  collection: CollectionChangeParams["collection"];
  key: string;
  record: NonNullable<CollectionChangeParams["record"]>;
}): CollectionChangeParams {
  return {
    cursor,
    collection,
    key,
    op: "upsert",
    record,
  };
}

function changesResult({
  cursor,
  changes = [],
  hasMore = false,
  resetRequired = false,
}: {
  cursor: number;
  changes?: CollectionChangeParams[];
  hasMore?: boolean;
  resetRequired?: boolean;
}): CollectionsChangesSinceResult {
  return {
    changes,
    cursor,
    has_more: hasMore,
    reset_required: resetRequired,
  };
}

function bootstrapResult({
  cursor,
  projects = [],
  tasks = [],
}: {
  cursor: number;
  projects?: ProjectRecord[];
  tasks?: TaskRecord[];
}): CollectionsBootstrapResult {
  return {
    cursor,
    workspaces: [],
    projects,
    sessions: [],
    hypotheses: [],
    baselines: [],
    experiments: [],
    evaluations: [],
    measurements: [],
    analyses: [],
    hypothesis_experiment_links: [],
    agents: [],
    tasks,
    task_dependencies: [],
    task_entity_links: [],
    task_activities: [],
    analysis_activities: [],
    hypothesis_activities: [],
    baseline_activities: [],
    experiment_activities: [],
    evaluation_activities: [],
    artifacts: [],
    events: [],
    compute_targets: [],
  };
}

function workspaceRecord({
  overrides = {},
}: {
  overrides?: Partial<WorkspaceRecord>;
}): WorkspaceRecord {
  return {
    id: WORKSPACE_ID,
    repo_path: "/tmp/repo",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function projectRecord({
  overrides = {},
}: {
  overrides?: Partial<ProjectRecord>;
}): ProjectRecord {
  return {
    id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    title: "Improve score",
    objective: "Improve score.",
    research_context: "Run project-native tests and collect plaintext evidence.",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function sessionRecord({
  overrides = {},
}: {
  overrides?: Partial<SessionRecord>;
}): SessionRecord {
  return {
    id: SESSION_ID,
    workspace_id: WORKSPACE_ID,
    project_id: PROJECT_ID,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function hypothesisRecord({
  overrides = {},
}: {
  overrides?: Partial<HypothesisRecord>;
}): HypothesisRecord {
  return {
    id: "H1",
    project_id: PROJECT_ID,
    created_in_session_id: SESSION_ID,
    title: "Component C helps",
    summary: "Component C may improve score.",
    status: "active",
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function experimentRecord({
  overrides = {},
}: {
  overrides?: Partial<ExperimentRecord>;
}): ExperimentRecord {
  return {
    id: "EX1",
    project_id: PROJECT_ID,
    created_in_session_id: SESSION_ID,
    status: "closed",
    title: "Record baseline",
    summary: "Baseline toy evaluation.",
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function baselineRecord({
  overrides = {},
}: {
  overrides?: Partial<BaselineRecord>;
}): BaselineRecord {
  return {
    id: "B1",
    project_id: PROJECT_ID,
    created_in_session_id: SESSION_ID,
    status: "closed",
    title: "Current workspace baseline",
    summary: "Reference behavior before candidate changes.",
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function evaluationRecord({
  overrides = {},
}: {
  overrides?: Partial<EvaluationRecord>;
}): EvaluationRecord {
  return {
    id: "EV1",
    project_id: PROJECT_ID,
    created_in_session_id: SESSION_ID,
    status: "closed",
    title: "Baseline project eval",
    summary: "Baseline toy evaluation.",
    associated_baseline_id: "B1",
    associated_experiment_id: undefined,
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function measurementRecord({
  overrides = {},
}: {
  overrides?: Partial<MeasurementRecord>;
}): MeasurementRecord {
  return {
    id: "M1",
    evaluation_id: "EV1",
    created_in_session_id: SESSION_ID,
    actor: "agent",
    body: "Baseline result recorded.",
    payload: { activity_type: "result", metrics: { score: { value: 0.71 } } },
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function analysisRecord({
  overrides = {},
}: {
  overrides?: Partial<AnalysisRecord>;
}): AnalysisRecord {
  return {
    id: "A1",
    project_id: PROJECT_ID,
    created_in_session_id: SESSION_ID,
    created_by_agent_id: "agent_P1_scientist",
    status: "open",
    title: "Codebase map",
    summary: "Mapped the main backend primitives.",
    content: "Records and repositories define the durable research records.",
    supersedes_analysis_id: undefined,
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function agentRecord({
  overrides = {},
}: {
  overrides?: Partial<AgentRecord>;
}): AgentRecord {
  return {
    id: "agent_P1_scientist",
    project_id: PROJECT_ID,
    created_in_session_id: SESSION_ID,
    kind: "scientist",
    display_name: "Scientist",
    model_name: "anthropic:test",
    status: "idle",
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function taskRecord({
  overrides = {},
}: {
  overrides?: Partial<TaskRecord>;
}): TaskRecord {
  return {
    id: "T1",
    project_id: PROJECT_ID,
    created_in_session_id: SESSION_ID,
    title: "Record baseline",
    content: "Run baseline eval and record evidence.",
    kind: "baseline",
    status: "backlog",
    priority: "high",
    source_kind: "manager",
    assignee_id: undefined,
    parent_task_id: undefined,
    payload: {},
    pydantic_run_id: undefined,
    conversation_id: undefined,
    result_summary: undefined,
    created_at: "2026-01-01T00:00:01Z",
    available_at: "2026-01-01T00:00:01Z",
    claimed_in_session_id: undefined,
    claimed_at: undefined,
    completed_in_session_id: undefined,
    completed_at: undefined,
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function taskDependencyRecord({
  overrides = {},
}: {
  overrides?: Partial<TaskDependencyRecord>;
}): TaskDependencyRecord {
  return {
    project_id: PROJECT_ID,
    task_id: "T2",
    blocked_by_task_id: "T1",
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function taskEntityLinkRecord({
  overrides = {},
}: {
  overrides?: Partial<TaskEntityLinkRecord>;
}): TaskEntityLinkRecord {
  return {
    project_id: PROJECT_ID,
    task_id: "T1",
    entity_kind: "evaluation",
    entity_id: "EV1",
    relationship: "created",
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function taskActivityRecord({
  overrides = {},
}: {
  overrides?: Partial<TaskActivityRecord>;
}): TaskActivityRecord {
  return {
    id: 1,
    project_id: PROJECT_ID,
    task_id: "T1",
    created_in_session_id: SESSION_ID,
    actor_agent_id: "agent_P1_scientist",
    actor: "agent",
    kind: "comment",
    body: "Baseline task claimed.",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function experimentActivityRecord({
  overrides = {},
}: {
  overrides?: Partial<ExperimentActivityRecord>;
}): ExperimentActivityRecord {
  return {
    id: 1,
    experiment_id: "EX1",
    created_in_session_id: SESSION_ID,
    actor: "worker",
    kind: "comment",
    body: "Baseline result recorded.",
    payload: { activity_type: "result", signals: [{ key: "score", value: 0.71 }] },
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function analysisActivityRecord({
  overrides = {},
}: {
  overrides?: Partial<AnalysisActivityRecord>;
}): AnalysisActivityRecord {
  return {
    id: 1,
    analysis_id: "A1",
    created_in_session_id: SESSION_ID,
    actor: "agent",
    kind: "comment",
    body: "This note should feed hypothesis generation.",
    payload: { source: "first pass" },
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function evaluationActivityRecord({
  overrides = {},
}: {
  overrides?: Partial<EvaluationActivityRecord>;
}): EvaluationActivityRecord {
  return {
    id: 1,
    evaluation_id: "EV1",
    created_in_session_id: SESSION_ID,
    actor: "agent",
    kind: "result",
    body: "Baseline result recorded.",
    payload: { activity_type: "result", signals: [{ key: "score", value: 0.71 }] },
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function eventRecord({ overrides = {} }: { overrides?: Partial<EventRecord> }): EventRecord {
  return {
    id: 1,
    associated_project_id: PROJECT_ID,
    associated_session_id: SESSION_ID,
    type: "session.started",
    message: "Started S1",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}
