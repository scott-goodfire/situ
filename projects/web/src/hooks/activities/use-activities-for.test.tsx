import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import {
  ReplicacheTestProvider,
  createTestReplicache,
  seedReplicache,
  type TestReplicache,
} from "../../test-utils/replicache";
import { useActivitiesFor } from "./use-activities-for";

let rep: TestReplicache;

afterEach(async () => {
  await rep?.close();
});

test("useActivitiesFor returns rows under the prefix whose entityKey equals entityId", async () => {
  rep = createTestReplicache();
  await seedReplicache(rep, {
    "activities/a1": { id: "a1", hypothesisId: "h-1", body: "started" },
    "activities/a2": { id: "a2", hypothesisId: "h-2", body: "other" },
    "activities/a3": { id: "a3", hypothesisId: "h-1", body: "progress" },
    "activities/a4": { id: "a4", experimentId: "h-1", body: "wrong-key" },
    "other/x": { id: "x", hypothesisId: "h-1", body: "wrong-prefix" },
  });

  const { result } = renderHook(() => useActivitiesFor("activities/", "hypothesisId", "h-1"), {
    wrapper: ({ children }) => (
      <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
    ),
  });

  await waitFor(() => {
    expect(result.current).toHaveLength(2);
  });
  expect(result.current.map((row) => row.id).sort()).toEqual(["a1", "a3"]);
});

test("useActivitiesFor returns an empty list when no row matches", async () => {
  rep = createTestReplicache();
  await seedReplicache(rep, {
    "activities/a1": { id: "a1", hypothesisId: "h-other", body: "x" },
  });

  const { result } = renderHook(() => useActivitiesFor("activities/", "hypothesisId", "h-1"), {
    wrapper: ({ children }) => (
      <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
    ),
  });

  await waitFor(() => {
    expect(result.current).toEqual([]);
  });
});
