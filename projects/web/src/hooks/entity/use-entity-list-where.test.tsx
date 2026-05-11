import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import {
  ReplicacheTestProvider,
  createTestReplicache,
  seedReplicache,
  type TestReplicache,
} from "../../test-utils/replicache";
import { useEntityListWhere } from "./use-entity-list-where";

type Row = { id: string; status: "open" | "closed" };

let rep: TestReplicache;

afterEach(async () => {
  await rep?.close();
});

test("useEntityListWhere returns only rows matching the predicate", async () => {
  rep = createTestReplicache();
  await seedReplicache(rep, {
    "rows/a": { id: "a", status: "open" },
    "rows/b": { id: "b", status: "closed" },
    "rows/c": { id: "c", status: "open" },
    "other/x": { id: "x", status: "open" },
  });

  const { result } = renderHook(
    () => useEntityListWhere<Row>("rows/", (row) => row.status === "open"),
    {
      wrapper: ({ children }) => (
        <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
      ),
    },
  );

  await waitFor(() => {
    expect(result.current).toHaveLength(2);
  });
  expect(result.current.map((row) => row.id).sort()).toEqual(["a", "c"]);
});

test("useEntityListWhere starts with the default value before the query resolves", () => {
  rep = createTestReplicache();
  const { result } = renderHook(() => useEntityListWhere<Row>("rows/", () => true), {
    wrapper: ({ children }) => (
      <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
    ),
  });
  expect(result.current).toEqual([]);
});
