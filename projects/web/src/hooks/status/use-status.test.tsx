import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import {
  ReplicacheTestProvider,
  createTestReplicache,
  seedReplicache,
  type TestReplicache,
} from "../../test-utils/replicache";
import { useStatus } from ".";

let rep: TestReplicache;

afterEach(async () => {
  await rep?.close();
});

test("useStatus returns the all-null default when the status key is missing", async () => {
  rep = createTestReplicache();

  const { result } = renderHook(() => useStatus(), {
    wrapper: ({ children }) => (
      <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
    ),
  });

  await waitFor(() => {
    expect(result.current).toEqual({ agent: null, environment: null, session: null });
  });
});

test("useStatus returns the seeded status row when present", async () => {
  rep = createTestReplicache();
  await seedReplicache(rep, {
    status: { agent: "scientist-1", environment: "local", session: "ses_42" },
  });

  const { result } = renderHook(() => useStatus(), {
    wrapper: ({ children }) => (
      <ReplicacheTestProvider rep={rep}>{children}</ReplicacheTestProvider>
    ),
  });

  await waitFor(() => {
    expect(result.current.agent).toBe("scientist-1");
  });
  expect(result.current).toEqual({
    agent: "scientist-1",
    environment: "local",
    session: "ses_42",
  });
});
