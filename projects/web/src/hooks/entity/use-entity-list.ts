import { useSubscribe } from "replicache-react";
import { useReplicache } from "../../app/replicache";

export function useEntityList<T>(prefix: string): T[] {
  const rep = useReplicache();
  return useSubscribe(rep, async (tx) => (await tx.scan({ prefix }).values().toArray()) as T[], {
    default: [] as T[],
    dependencies: [prefix],
  });
}
