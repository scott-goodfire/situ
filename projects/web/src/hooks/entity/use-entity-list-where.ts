import { useSubscribe } from "replicache-react";
import { useReplicache } from "../../app/replicache";

export function useEntityListWhere<T>(
  prefix: string,
  predicate: (row: T) => boolean,
  dependencies: ReadonlyArray<unknown> = [],
): T[] {
  const rep = useReplicache();
  return useSubscribe(
    rep,
    async (tx) => {
      const rows = (await tx.scan({ prefix }).values().toArray()) as T[];
      return rows.filter(predicate);
    },
    { default: [] as T[], dependencies: [prefix, ...dependencies] },
  );
}
