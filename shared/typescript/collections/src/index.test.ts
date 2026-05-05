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
  ExperimentRecord,
  RunRecord,
} from "@almanac/protocol";

describe("almanac collections", () => {
  test("hydrates runs, experiments, and events from bootstrap data", async () => {
    const collections = createAlmanacCollections();
    const bootstrap: CollectionsBootstrapResult = {
      cursor: 2,
      runs: [
        runRecord({
          overrides: { id: "run_0001", status: "running" },
        }),
      ],
      experiments: [
        experimentRecord({
          overrides: {
            id: "exp_run_0001_baseline",
            run_id: "run_0001",
            status: "completed",
          },
        }),
      ],
      events: [
        eventRecord({
          overrides: { id: 1, type: "run.started" },
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

    expect(collections.runs.get("run_0001")?.status).toBe("running");
    expect(collections.experiments.get("exp_run_0001_baseline")?.status).toBe(
      "completed",
    );
    expect(collections.events.get("1")?.type).toBe("run.started");
    expect(collections.events.get("2")?.type).toBe("experiment.completed");
  });

  test("applies collection upserts as inserts and updates", async () => {
    const collections = createAlmanacCollections();

    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "runs",
        key: "run_0001",
        record: runRecord({
          overrides: { id: "run_0001", status: "running" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "runs",
        key: "run_0001",
        record: runRecord({
          overrides: { id: "run_0001", status: "completed" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "experiments",
        key: "exp_run_0001_a",
        record: experimentRecord({
          overrides: { id: "exp_run_0001_a", status: "running" },
        }),
      }),
    });
    await applyCollectionUpsert({
      collections,
      upsert: upsert({
        collection: "events",
        key: "3",
        record: eventRecord({
          overrides: { id: 3, type: "run.completed" },
        }),
      }),
    });

    expect(collections.runs.size).toBe(1);
    expect(collections.runs.get("run_0001")?.status).toBe("completed");
    expect(collections.experiments.get("exp_run_0001_a")?.status).toBe("running");
    expect(collections.events.get("3")?.type).toBe("run.completed");
  });
});

function upsert({
  collection,
  key,
  record,
}: {
  collection: CollectionUpsertedParams["collection"];
  key: string;
  record: RunRecord | ExperimentRecord | EventRecord;
}): CollectionUpsertedParams {
  return {
    cursor: 1,
    collection,
    key,
    record: record as unknown as Record<string, unknown>,
  };
}

function runRecord({ overrides = {} }: { overrides?: Partial<RunRecord> }): RunRecord {
  return {
    id: "run_0001",
    status: "running",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function experimentRecord({
  overrides = {},
}: {
  overrides?: Partial<ExperimentRecord>;
}): ExperimentRecord {
  return {
    id: "exp_run_0001_baseline",
    run_id: "run_0001",
    status: "queued",
    intent: "Record baseline evidence.",
    change_summary: "Baseline toy evaluation.",
    components: ["baseline"],
    based_on: [],
    suspicious: false,
    suspicious_reason: null,
    note: "",
    created_at: "2026-01-01T00:00:01Z",
    updated_at: "2026-01-01T00:00:01Z",
    ...overrides,
  };
}

function eventRecord({ overrides = {} }: { overrides?: Partial<EventRecord> }): EventRecord {
  return {
    id: 1,
    run_id: "run_0001",
    type: "run.started",
    message: "Started run_0001",
    payload: {},
    created_at: "2026-01-01T00:00:02Z",
    ...overrides,
  };
}
