import { Replicache, dropDatabase, makeIDBName } from "replicache";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const REPLICACHE_SCHEMA_VERSION = "2";
const REPLICACHE_SESSION_STORAGE_KEY = "situ.replicache.session.v1";

type ReplicacheBootstrap = {
  sessionId: string;
  replicacheName: string;
};

type StoredReplicacheSession = {
  sessionId: string;
  replicacheName: string;
  schemaVersion: string;
};

type ReplicacheValue = {
  rep: Replicache;
  synced: boolean;
};

export const ReplicacheContext = createContext<ReplicacheValue | null>(null);

export function ReplicacheProvider({ children }: { children: ReactNode }) {
  const [rep, setRep] = useState<Replicache | null>(null);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let activeRep: Replicache | undefined;
    let events: EventSource | undefined;
    const controller = new AbortController();

    const setup = async () => {
      try {
        const bootstrap = await fetchReplicacheBootstrap({ signal: controller.signal });
        if (disposed) {
          return;
        }
        await resetUnexpectedReplicacheSession({ bootstrap });
        if (disposed) {
          return;
        }
        const nextRep = new Replicache({
          name: bootstrap.replicacheName,
          schemaVersion: REPLICACHE_SCHEMA_VERSION,
          pullURL: "/api/replicache/pull",
          pullInterval: null,
          logLevel: "error",
          mutators: {},
        });
        activeRep = nextRep;
        setRep(nextRep);
        void nextRep.pull({ now: true }).finally(() => {
          if (!disposed) {
            setSynced(true);
          }
        });

        events = new EventSource("/api/replicache/poke");
        events.addEventListener("poke", () => {
          void nextRep.pull({ now: true });
        });
      } catch (caught) {
        if (!disposed && !controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Failed to initialize sync");
        }
      }
    };

    void setup();
    return () => {
      disposed = true;
      controller.abort();
      events?.close();
      void activeRep?.close();
    };
  }, []);

  if (error) {
    return <div role="alert">Failed to initialize local sync: {error}</div>;
  }

  if (!rep) {
    return <div role="status">Syncing local state...</div>;
  }

  return (
    <ReplicacheContext.Provider value={{ rep, synced }}>{children}</ReplicacheContext.Provider>
  );
}

async function fetchReplicacheBootstrap({
  signal,
}: {
  signal: AbortSignal;
}): Promise<ReplicacheBootstrap> {
  const response = await fetch("/api/bootstrap", { signal });
  if (!response.ok) {
    throw new Error(`Failed to load bootstrap: ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    typeof payload.sessionId !== "string" ||
    typeof payload.replicacheName !== "string"
  ) {
    throw new Error("Bootstrap response did not include a Replicache session.");
  }
  return { sessionId: payload.sessionId, replicacheName: payload.replicacheName };
}

async function resetUnexpectedReplicacheSession({
  bootstrap,
}: {
  bootstrap: ReplicacheBootstrap;
}): Promise<void> {
  const previous = readStoredReplicacheSession();
  const isExpectedSession =
    previous?.sessionId === bootstrap.sessionId &&
    previous.replicacheName === bootstrap.replicacheName &&
    previous.schemaVersion === REPLICACHE_SCHEMA_VERSION;
  if (previous && !isExpectedSession) {
    await dropStaleReplicacheDatabase({ name: previous.replicacheName });
  }
  writeStoredReplicacheSession({
    sessionId: bootstrap.sessionId,
    replicacheName: bootstrap.replicacheName,
    schemaVersion: REPLICACHE_SCHEMA_VERSION,
  });
}

async function dropStaleReplicacheDatabase({ name }: { name: string }): Promise<void> {
  try {
    await dropDatabase(makeIDBName(name, REPLICACHE_SCHEMA_VERSION), { logLevel: "error" });
  } catch (caught) {
    console.warn(`Failed to drop stale Replicache database for ${name}.`, caught);
  }
}

function readStoredReplicacheSession(): StoredReplicacheSession | null {
  try {
    const raw = window.localStorage.getItem(REPLICACHE_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.replicacheName !== "string" ||
      typeof parsed.schemaVersion !== "string"
    ) {
      return null;
    }
    return {
      sessionId: parsed.sessionId,
      replicacheName: parsed.replicacheName,
      schemaVersion: parsed.schemaVersion,
    };
  } catch (caught) {
    console.warn("Failed to read stored Replicache session.", caught);
    return null;
  }
}

function writeStoredReplicacheSession(session: StoredReplicacheSession): void {
  try {
    window.localStorage.setItem(REPLICACHE_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (caught) {
    console.warn("Failed to store Replicache session.", caught);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function useReplicache(): Replicache {
  const value = useContext(ReplicacheContext);
  if (!value) {
    throw new Error("useReplicache must be used inside <ReplicacheProvider>");
  }
  return value.rep;
}

export function useReplicacheSynced(): boolean {
  const value = useContext(ReplicacheContext);
  if (!value) {
    throw new Error("useReplicacheSynced must be used inside <ReplicacheProvider>");
  }
  return value.synced;
}
