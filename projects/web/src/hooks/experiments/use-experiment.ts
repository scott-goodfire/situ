import type { ExperimentRecord } from "@situ/protocol";
import { useEntity } from "../entity";

export function useExperiment(id: string): ExperimentRecord | undefined {
  return useEntity<ExperimentRecord>("experiments/", id);
}
