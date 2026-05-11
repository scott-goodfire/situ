import type { ActivityRecord } from "@situ/protocol";
import { useEntityListWhere } from "../entity";

type WithEntityKey<K extends string> = ActivityRecord & { [P in K]: string };

export function useActivitiesFor<K extends string>(
  prefix: string,
  entityKey: K,
  entityId: string,
): ActivityRecord[] {
  return useEntityListWhere<WithEntityKey<K>>(prefix, (row) => row[entityKey] === entityId, [
    entityKey,
    entityId,
  ]);
}
