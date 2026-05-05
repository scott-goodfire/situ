import { describe, expect, test } from "bun:test";
import {
  applyBootstrap,
  applyCollectionUpsert,
  createAlmanacCollections,
} from "./index";
import type {
  CollectionUpsertedParams,
  CollectionsBootstrapResult,
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisRecord,
  ObjectiveRecord,
  ProjectRecord,
  ResearchContextRecord,
  SessionRecord,
} from "@almanac/protocol";

const PROJECT_ID = "project_0001";
const SESSION_ID = "session_0001";

describe("almanac collections", () => {
  test("hydrates projects, objectives, research contexts, sessions, activities, and events", async () => {
    const collections = createAlmanacCollections();
    const bootstrap: CollectionsBootstrapResult = {
      cursor: 2,
      projects: [projectRecord({})],
      objectives: [objectiveRecord({})],
      research_contexts: [researchContextRecord({})],
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

    expect(collections.projects.get(PROJECT_ID)?.repo_path).toBe("/tmp/repo");
    expect(collections.objectives.get(`obj_${SESSION_ID}`)?.title).toBe("Improve score");
    expect(collections.researchContexts.get(`rctx_${SESSION_ID}`)?.body).toBe(
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
    expect(collections.experimentActivities.get("1")?.kind).toBe("comment");
    expect(collections.evaluationActivities.get("1")?.kind).toBe("comment");
    expect(collections.events.get("1")?.type).toBe("session.started");
    expect(collections.events.get("2")?.type).toBe("experiment.completed");
  });

  test("handles bootstrap payloads from sessions missing newer collections", async () => {
    const collections = createAlmanacCollections();
    const bootstrap = {
      cursor: 1,
      projects: [projectRecord({})],
      objectives: [objectiveRecord({})],
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

    expect(collections.objectives.get(`obj_${SESSION_ID}`)?.title).toBe("Improve score");
    expect(collections.evaluations.size).toBe(0);
    expect(collections.evaluationActivities.size).toBe(0);
  });

  test("applies collection upserts as inserts and updates", async () => {
    const collections = createAlmanacCollections();

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
        collection: "research_contexts",
        key: `rctx_${SESSION_ID}`,
        record: researchContextRecord({}),
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

    expect(collections.projects.get(PROJECT_ID)?.repo_path).toBe("/tmp/repo");
    expect(collections.researchContexts.get(`rctx_${SESSION_ID}`)?.body).toBe(
      "Run project-native tests and collect plaintext evidence.",
    );
    expect(collections.sessions.size).toBe(1);
    expect(collections.sessions.get(SESSION_ID)?.status).toBe("closed");
    expect(collections.experiments.get("exp_session_0001_a")?.status).toBe("active");
    expect(collections.evaluations.get("eval_session_0001_a")?.status).toBe("active");
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
    | ProjectRecord
    | ObjectiveRecord
    | ResearchContextRecord
    | SessionRecord
    | HypothesisRecord
    | ExperimentRecord
    | EvaluationRecord
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

function projectRecord({
  overrides = {},
}: {
  overrides?: Partial<ProjectRecord>;
}): ProjectRecord {
  return {
    id: PROJECT_ID,
    repo_path: "/tmp/repo",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function objectiveRecord({
  overrides = {},
}: {
  overrides?: Partial<ObjectiveRecord>;
}): ObjectiveRecord {
  return {
    id: `obj_${SESSION_ID}`,
    session_id: SESSION_ID,
    title: "Improve score",
    description: "Improve toy score while preserving latency.",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function researchContextRecord({
  overrides = {},
}: {
  overrides?: Partial<ResearchContextRecord>;
}): ResearchContextRecord {
  return {
    id: `rctx_${SESSION_ID}`,
    session_id: SESSION_ID,
    body: "Run project-native tests and collect plaintext evidence.",
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
    session_id: SESSION_ID,
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
    session_id: SESSION_ID,
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
    session_id: SESSION_ID,
    status: "closed",
    title: "Baseline project eval",
    summary: "Baseline toy evaluation.",
    associated_experiment_id: undefined,
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
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
