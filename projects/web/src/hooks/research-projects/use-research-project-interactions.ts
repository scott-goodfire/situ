import type { ResearchProjectInteractionRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useResearchProjectInteractions(): ResearchProjectInteractionRecord[] {
  return useEntityList<ResearchProjectInteractionRecord>("researchProjectInteractions/");
}
