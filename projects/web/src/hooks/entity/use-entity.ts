import { useSubscribe } from "replicache-react";
import { useReplicache } from "../../app/replicache";

export function useEntity<T>(prefix: string, id: string): T | undefined {
  const rep = useReplicache();
  return (
    useSubscribe(rep, async (tx) => ((await tx.get(`${prefix}${id}`)) as T | undefined) ?? null, {
      default: null as T | null,
      dependencies: [prefix, id],
    }) ?? undefined
  );
}
