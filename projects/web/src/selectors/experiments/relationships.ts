import type {
  ArtifactRecord,
  HypothesisRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function hypothesesForExperiment({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}): HypothesisRecord[] {
  const hypothesisIds = new Set(
    filter(
      data.hypothesisExperimentLinks,
      (link) => link.experiment_id === experimentId,
    ).map((link) => link.hypothesis_id),
  );

  return filter(data.hypotheses, (hypothesis) => hypothesisIds.has(hypothesis.id));
}

export function artifactsForExperiment({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}): ArtifactRecord[] {
  return filter(
    data.artifacts,
    (artifact) =>
      artifact.associated_entity_kind === "experiment" &&
      artifact.associated_entity_id === experimentId,
  );
}

export function linkedHypothesisCount({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}): number {
  return filter(
    data.hypothesisExperimentLinks,
    (link) => link.experiment_id === experimentId,
  ).length;
}
