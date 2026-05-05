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
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";

describe("almanac collections", () => {
  test("hydrates objective, session, research objects, activities, and events", async () => {
    const collections = createAlmanacCollections();
    const bootstrap: CollectionsBootstrapResult = {
      cursor: 2,
      objectives: [objectiveRecord({})],
      sessions: [sessionRecord({ overrides: { id: "session_0001" } })],
      hypotheses: [hypothesisRecord({})],
      experiments: [experimentRecord({})],
      hypothesis_experiment_links: [
        {
          hypothesis_id: "hyp_0001",
          experiment_id: "exp_session_0001_baseline",
          note: "baseline",
          created_at: "2026-01-01T00:00:01Z",
        },
      ],
      hypothesis_activities: [],
      experiment_activities: [experimentActivityRecord({})],
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

    expect(collections.objectives.get("objective_0001")?.title).toBe("Improve score");
    expect(collections.sessions.get("session_0001")?.status).toBe("active");
    expect(collections.hypotheses.get("hyp_0001")?.status).toBe("active");
    expect(collections.experiments.get("exp_session_0001_baseline")?.status).toBe(
      "closed",
    );
    expect(collections.experimentActivities.get("1")?.kind).toBe("result");
    expect(collections.events.get("1")?.type).toBe("session.started");
    expect(collections.events.get("2")?.type).toBe("experiment.completed");
  });

  test("applies collection upserts as inserts and updates", async () => {
    const collections = createAlmanacCollections();

    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "sessions",
        key: "session_0001",
        record: sessionRecord({ overrides: { id: "session_0001", status: "active" } }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "sessions",
        key: "session_0001",
        record: sessionRecord({ overrides: { id: "session_0001", status: "closed" } }),
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
        collection: "experiment_activities",
        key: "3",
        record: experimentActivityRecord({
          overrides: { id: 3, kind: "concern" },
        }),
      }),
    });

    expect(collections.sessions.size).toBe(1);
    expect(collections.sessions.get("session_0001")?.status).toBe("closed");
    expect(collections.experiments.get("exp_session_0001_a")?.status).toBe("active");
    expect(collections.experimentActivities.get("3")?.kind).toBe("concern");
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
    | ObjectiveRecord
    | SessionRecord
    | HypothesisRecord
    | ExperimentRecord
    | ExperimentActivityRecord
    | EventRecord;
}): CollectionUpsertedParams {
  return {
    cursor: 1,
    collection,
    key,
    record: record as unknown as Record<string, unknown>,
  };
}

function objectiveRecord({
  overrides = {},
}: {
  overrides?: Partial<ObjectiveRecord>;
}): ObjectiveRecord {
  return {
    id: "objective_0001",
    title: "Improve score",
    description: "Improve toy score while preserving latency.",
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
    id: "session_0001",
    objective_id: "objective_0001",
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
    objective_id: "objective_0001",
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
    objective_id: "objective_0001",
    status: "closed",
    title: "Record baseline",
    summary: "Baseline toy evaluation.",
    created_in_session_id: "session_0001",
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
    session_id: "session_0001",
    actor: "worker",
    kind: "result",
    body: "Baseline result recorded.",
    payload: { signals: [{ key: "score", value: 0.71 }] },
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}

function eventRecord({ overrides = {} }: { overrides?: Partial<EventRecord> }): EventRecord {
  return {
    id: 1,
    session_id: "session_0001",
    type: "session.started",
    message: "Started session_0001",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}
