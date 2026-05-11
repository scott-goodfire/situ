import type { ResearchProjectRecord } from "@situ/protocol";
import { useEntityListResult, type EntityListResult } from "../entity";

export function useResearchProjectsResult(): EntityListResult<ResearchProjectRecord> {
  return useEntityListResult<ResearchProjectRecord>("researchProjects/");
}
