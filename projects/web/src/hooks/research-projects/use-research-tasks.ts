import type { ResearchTaskRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useResearchTasks(): ResearchTaskRecord[] {
  return useEntityList<ResearchTaskRecord>("researchTasks/");
}
