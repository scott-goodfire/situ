import type { ExperimentRecord } from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function experimentsForHypothesis({
  data,
  hypothesisId,
}: {
  data: ProjectWorkspaceData;
  hypothesisId: string;
}): ExperimentRecord[] {
  const experimentIds = new Set(
    filter(
      data.hypothesisExperimentLinks,
      (link) => link.hypothesis_id === hypothesisId,
    ).map((link) => link.experiment_id),
  );

  return filter(data.experiments, (experiment) => experimentIds.has(experiment.id));
}
