import type { WorkItemRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useWorkItems(): WorkItemRecord[] {
  return useEntityList<WorkItemRecord>("workItems/");
}
