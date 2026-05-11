import { useSubscribe } from "replicache-react";
import { useReplicache } from "../../app/replicache";

export type EntityListResult<T> =
  | { status: "loading"; records: undefined }
  | { status: "ready"; records: T[] };

export function useEntityListResult<T>(prefix: string): EntityListResult<T> {
  const rep = useReplicache();
  const records = useSubscribe(
    rep,
    async (tx) => (await tx.scan({ prefix }).values().toArray()) as T[],
    { dependencies: [prefix] },
  );
  if (records === undefined) {
    return { status: "loading", records: undefined };
  }
  return { status: "ready", records };
}
