import type { ResearchProjectRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useResearchProjects(): ResearchProjectRecord[] {
  return useEntityList<ResearchProjectRecord>("researchProjects/");
}
