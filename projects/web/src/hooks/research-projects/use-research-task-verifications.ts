import type { ResearchTaskVerificationRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useResearchTaskVerifications(): ResearchTaskVerificationRecord[] {
  return useEntityList<ResearchTaskVerificationRecord>("researchTaskVerifications/");
}
