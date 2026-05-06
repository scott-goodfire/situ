import { describe, expect, test } from "bun:test";
import {
  applyBootstrap,
  applyCollectionUpsert,
  createSituCollections,
} from "./index";
import type {
  AgentRecord,
  CollectionUpsertedParams,
  CollectionsBootstrapResult,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisRecord,
  ProjectRecord,
  SessionRecord,
  TaskActivityRecord,
  TaskDependencyRecord,
  TaskEntityLinkRecord,
  TaskRecord,
  WorkspaceRecord,
} from "@situ/protocol";

const WORKSPACE_ID = "workspace_0001";
const PROJECT_ID = "project_0001";
const SESSION_ID = "session_0001";

describe("situ collections", () => {
  test("hydrates workspaces, projects, sessions, activities, and events", async () => {
    const collections = createSituCollections();
    const bootstrap: CollectionsBootstrapResult = {
      cursor: 2,
      workspaces: [workspaceRecord({})],
      projects: [projectRecord({})],
      sessions: [sessionRecord({ overrides: { id: SESSION_ID } })],
      hypotheses: [hypothesisRecord({})],
      experiments: [experimentRecord({})],
      evaluations: [evaluationRecord({})],
      hypothesis_experiment_links: [
        {
          hypothesis_id: "hyp_0001",
          experiment_id: "exp_session_0001_baseline",
          created_at: "2026-01-01T00:00:01Z",
        },
      ],
      agents: [agentRecord({})],
      tasks: [taskRecord({})],
      task_dependencies: [taskDependencyRecord({})],
      task_entity_links: [taskEntityLinkRecord({})],
      task_activities: [taskActivityRecord({})],
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
    expect(collections.hypotheses.get("hyp_0001")?.status).toBe("active");
    expect(collections.experiments.get("exp_session_0001_baseline")?.status).toBe(
      "closed",
    );
    expect(collections.evaluations.get("eval_session_0001_baseline")?.status).toBe(
      "closed",
    );
    expect(collections.agents.get("agent_session_0001_scientist")?.kind).toBe(
      "scientist",
    );
    expect(collections.tasks.get("task_session_0001_001")?.kind).toBe("baseline");
    expect(collections.taskDependencies.get("task_session_0001_002:task_session_0001_001")?.blocked_by_task_id).toBe(
      "task_session_0001_001",
    );
    expect(collections.taskEntityLinks.get("task_session_0001_001:evaluation:eval_session_0001_baseline:created")?.entity_id).toBe(
      "eval_session_0001_baseline",
    );
    expect(collections.taskActivities.get("1")?.task_id).toBe("task_session_0001_001");
    expect(collections.experimentActivities.get("1")?.kind).toBe("comment");
    expect(collections.evaluationActivities.get("1")?.kind).toBe("comment");
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
    expect(collections.evaluations.size).toBe(0);
    expect(collections.evaluationActivities.size).toBe(0);
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
        collection: "experiments",
        key: "exp_session_0001_a",
        record: experimentRecord({
          overrides: { id: "exp_session_0001_a", status: "active" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "evaluations",
        key: "eval_session_0001_a",
        record: evaluationRecord({
          overrides: { id: "eval_session_0001_a", status: "active" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "agents",
        key: "agent_session_0001_scientist",
        record: agentRecord({}),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "tasks",
        key: "task_session_0001_001",
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

    expect(collections.workspaces.get(WORKSPACE_ID)?.repo_path).toBe("/tmp/repo");
    expect(collections.projects.get(PROJECT_ID)?.research_context).toBe(
      "Run project-native tests and collect plaintext evidence.",
    );
    expect(collections.sessions.size).toBe(1);
    expect(collections.sessions.get(SESSION_ID)?.status).toBe("closed");
    expect(collections.experiments.get("exp_session_0001_a")?.status).toBe("active");
    expect(collections.evaluations.get("eval_session_0001_a")?.status).toBe("active");
    expect(collections.agents.get("agent_session_0001_scientist")?.status).toBe("idle");
    expect(collections.tasks.get("task_session_0001_001")?.priority).toBe("high");
    expect(collections.taskActivities.get("1")?.actor_agent_id).toBe(
      "agent_session_0001_scientist",
    );
    expect(collections.experimentActivities.get("3")?.kind).toBe("comment");
    expect(collections.experimentActivities.get("3")?.payload.activity_type).toBe(
      "concern",
    );
    expect(collections.evaluationActivities.get("4")?.payload.activity_type).toBe(
      "result",
    );
  });
});

function upsert({
  collection,
  key,
  record,
}: {
  collection: CollectionUpsertedParams["collection"];
  key: string;
  record:
    | WorkspaceRecord
    | ProjectRecord
    | SessionRecord
    | HypothesisRecord
    | ExperimentRecord
    | EvaluationRecord
    | AgentRecord
    | TaskRecord
    | TaskDependencyRecord
    | TaskEntityLinkRecord
    | TaskActivityRecord
    | ExperimentActivityRecord
    | EvaluationActivityRecord
    | EventRecord;
}): CollectionUpsertedParams {
  return {
    cursor: 1,
    collection,
    key,
    record: record as unknown as Record<string, unknown>,
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
    id: "hyp_0001",
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
    id: "exp_session_0001_baseline",
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

function evaluationRecord({
  overrides = {},
}: {
  overrides?: Partial<EvaluationRecord>;
}): EvaluationRecord {
  return {
    id: "eval_session_0001_baseline",
    project_id: PROJECT_ID,
    created_in_session_id: SESSION_ID,
    status: "closed",
    title: "Baseline project eval",
    summary: "Baseline toy evaluation.",
    associated_experiment_id: undefined,
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
    id: "agent_session_0001_scientist",
    session_id: SESSION_ID,
    kind: "scientist",
    display_name: "Scientist",
    model_name: "openai:test",
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
    id: "task_session_0001_001",
    session_id: SESSION_ID,
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
    claimed_at: undefined,
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
    task_id: "task_session_0001_002",
    blocked_by_task_id: "task_session_0001_001",
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
    task_id: "task_session_0001_001",
    entity_kind: "evaluation",
    entity_id: "eval_session_0001_baseline",
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
    task_id: "task_session_0001_001",
    actor_agent_id: "agent_session_0001_scientist",
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
    experiment_id: "exp_session_0001_baseline",
    created_in_session_id: SESSION_ID,
    actor: "worker",
    kind: "comment",
    body: "Baseline result recorded.",
    payload: { activity_type: "result", signals: [{ key: "score", value: 0.71 }] },
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
    evaluation_id: "eval_session_0001_baseline",
    created_in_session_id: SESSION_ID,
    actor: "agent",
    kind: "comment",
    body: "Baseline result recorded.",
    payload: { activity_type: "result", signals: [{ key: "score", value: 0.71 }] },
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function eventRecord({ overrides = {} }: { overrides?: Partial<EventRecord> }): EventRecord {
  return {
    id: 1,
    session_id: SESSION_ID,
    type: "session.started",
    message: "Started session_0001",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}
