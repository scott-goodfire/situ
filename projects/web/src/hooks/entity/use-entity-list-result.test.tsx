import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import {
  ReplicacheTestProvider,
  createTestReplicache,
  seedReplicache,
  type TestReplicache,
} from "../../test-utils/replicache";
import { useEntityListResult } from "./use-entity-list-result";

type Row = { id: string };

let rep: TestReplicache;

afterEach(async () => {
  await rep?.close();
});

test("useEntityListResult reports loading until the first query result arrives", async () => {
  rep = createTestReplicache();

  const { result } = renderHook(() => useEntityListResult<Row>("rows/"), {
    wrapper: ({ children }) => (
      <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
    ),
  });

  expect(result.current).toEqual({ status: "loading", records: undefined });

  await waitFor(() => {
    expect(result.current).toEqual({ status: "ready", records: [] });
  });
});

test("useEntityListResult returns rows after the query resolves", async () => {
  rep = createTestReplicache();
  await seedReplicache(rep, {
    "rows/a": { id: "a" },
    "rows/b": { id: "b" },
    "other/x": { id: "x" },
  });

  const { result } = renderHook(() => useEntityListResult<Row>("rows/"), {
    wrapper: ({ children }) => (
      <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
    ),
  });

  await waitFor(() => {
    expect(result.current.status).toBe("ready");
  });
  if (result.current.status === "ready") {
    expect(result.current.records.map((row) => row.id).sort()).toEqual(["a", "b"]);
  }
});
