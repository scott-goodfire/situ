import type { StatusRecord } from "@situ/protocol";
import { useSubscribe } from "replicache-react";
import { useReplicache } from "../../app/replicache";

const DEFAULT_STATUS: StatusRecord = { agent: null, environment: null, session: null };

export function useStatus(): StatusRecord {
  const rep = useReplicache();
  return (
    useSubscribe(
      rep,
      async (tx) => ((await tx.get("status")) as StatusRecord | undefined) ?? null,
      { default: null as StatusRecord | null, dependencies: ["status"] },
    ) ?? DEFAULT_STATUS
  );
}
