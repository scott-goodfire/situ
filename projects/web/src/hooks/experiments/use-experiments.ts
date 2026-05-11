import type { ExperimentRecord } from "@situ/protocol";
import { useEntityList } from "../entity";

export function useExperiments(): ExperimentRecord[] {
  return useEntityList<ExperimentRecord>("experiments/");
}
