import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

type MockReplicacheOptions = {
  name: string;
  schemaVersion: string;
  pullURL: string;
  pullInterval: null;
  logLevel: string;
  mutators: Record<string, never>;
};

const createdReplicacheOptions = vi.hoisted(() => [] as MockReplicacheOptions[]);
const pullCalls = vi.hoisted(() => [] as Array<{ now: boolean }>);
const closeCalls = vi.hoisted(() => [] as boolean[]);
const droppedDatabaseNames = vi.hoisted(() => [] as string[]);

vi.mock("replicache", () => ({
  Replicache: class {
    constructor(options: MockReplicacheOptions) {
      createdReplicacheOptions.push(options);
    }

    pull(options: { now: boolean }): Promise<void> {
      pullCalls.push(options);
      return Promise.resolve();
    }

    close(): Promise<void> {
      closeCalls.push(true);
      return Promise.resolve();
    }
  },
  dropDatabase: (dbName: string): Promise<void> => {
    droppedDatabaseNames.push(dbName);
    return Promise.resolve();
  },
  makeIDBName: (name: string, schemaVersion?: string): string =>
    `idb:${name}:${schemaVersion ?? ""}`,
}));

import { ReplicacheProvider, useReplicache, useReplicacheSynced } from "./replicache";

const replicacheSessionStorageKey = "situ.replicache.session.v1";

const eventSourceUrls: string[] = [];
const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

class TestEventSource {
  constructor(url: string | URL) {
    eventSourceUrls.push(String(url));
  }

  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}

  close(): void {}
}

beforeEach(() => {
  createdReplicacheOptions.length = 0;
  pullCalls.length = 0;
  closeCalls.length = 0;
  droppedDatabaseNames.length = 0;
  eventSourceUrls.length = 0;
  fetchCalls.length = 0;
  window.localStorage.clear();

  const fetchBootstrap = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    fetchCalls.push({ input, init });
    return new Response(
      JSON.stringify({ sessionId: "ses_test", replicacheName: "situ-session-ses_test" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  };

  vi.stubGlobal("fetch", fetchBootstrap);
  vi.stubGlobal("EventSource", TestEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

test("ReplicacheProvider uses the session-scoped name from bootstrap", async () => {
  const { unmount } = render(
    <ReplicacheProvider>
      <Probe />
    </ReplicacheProvider>,
  );

  expect(screen.getByRole("status").textContent).toBe("Syncing local state...");

  await screen.findByTestId("replicache-probe");

  expect(fetchCalls[0]?.input).toBe("/api/bootstrap");
  expect(fetchCalls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  expect(createdReplicacheOptions).toEqual([
    {
      name: "situ-session-ses_test",
      schemaVersion: "2",
      pullURL: "/api/replicache/pull",
      pullInterval: null,
      logLevel: "error",
      mutators: {},
    },
  ]);
  expect(eventSourceUrls).toEqual(["/api/replicache/poke"]);
  expect(pullCalls).toEqual([{ now: true }]);
  expect(droppedDatabaseNames).toEqual([]);
  expect(window.localStorage.getItem(replicacheSessionStorageKey)).toBe(
    JSON.stringify({
      sessionId: "ses_test",
      replicacheName: "situ-session-ses_test",
      schemaVersion: "2",
    }),
  );

  await waitFor(() => {
    expect(screen.getByTestId("replicache-probe").textContent).toBe("synced");
  });

  unmount();
  expect(closeCalls).toEqual([true]);
});

test("ReplicacheProvider resets the previous session cache when the backend session changes", async () => {
  window.localStorage.setItem(
    replicacheSessionStorageKey,
    JSON.stringify({
      sessionId: "ses_old",
      replicacheName: "situ-session-ses_old",
      schemaVersion: "2",
    }),
  );

  render(
    <ReplicacheProvider>
      <Probe />
    </ReplicacheProvider>,
  );

  await screen.findByTestId("replicache-probe");

  expect(droppedDatabaseNames).toEqual(["idb:situ-session-ses_old:2"]);
  expect(createdReplicacheOptions.map((options) => options.name)).toEqual([
    "situ-session-ses_test",
  ]);
  expect(window.localStorage.getItem(replicacheSessionStorageKey)).toBe(
    JSON.stringify({
      sessionId: "ses_test",
      replicacheName: "situ-session-ses_test",
      schemaVersion: "2",
    }),
  );
});

test("ReplicacheProvider resets when the stored session id is unexpected", async () => {
  window.localStorage.setItem(
    replicacheSessionStorageKey,
    JSON.stringify({
      sessionId: "ses_old",
      replicacheName: "situ-session-ses_test",
      schemaVersion: "2",
    }),
  );

  render(
    <ReplicacheProvider>
      <Probe />
    </ReplicacheProvider>,
  );

  await screen.findByTestId("replicache-probe");

  expect(droppedDatabaseNames).toEqual(["idb:situ-session-ses_test:2"]);
  expect(createdReplicacheOptions.map((options) => options.name)).toEqual([
    "situ-session-ses_test",
  ]);
});

function Probe() {
  useReplicache();
  const synced = useReplicacheSynced();
  return <div data-testid="replicache-probe">{synced ? "synced" : "syncing"}</div>;
}
