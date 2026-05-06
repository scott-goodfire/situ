import type {
  ArtifactRecord,
  EvaluationRecord,
  ExperimentRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function evaluationsForExperiment({
  data,
  experimentId,
}: {
  data: ProjectWorkspaceData;
  experimentId: string;
}): EvaluationRecord[] {
  return filter(
    data.evaluations,
    (evaluation) => evaluation.associated_experiment_id === experimentId,
  );
}

export function evaluationsForExperiments({
  data,
  experiments,
}: {
  data: ProjectWorkspaceData;
  experiments: ExperimentRecord[];
}): EvaluationRecord[] {
  const experimentIds = new Set(experiments.map((experiment) => experiment.id));

  return filter(data.evaluations, (evaluation) => {
    if (!evaluation.associated_experiment_id) {
      return false;
    }

    return experimentIds.has(evaluation.associated_experiment_id);
  });
}

export function sourceExperimentForEvaluation({
  data,
  evaluation,
}: {
  data: ProjectWorkspaceData;
  evaluation: EvaluationRecord;
}): ExperimentRecord | undefined {
  if (!evaluation.associated_experiment_id) {
    return undefined;
  }

  return data.experiments.find(
    (experiment) => experiment.id === evaluation.associated_experiment_id,
  );
}

export function artifactsForEvaluation({
  data,
  evaluationId,
}: {
  data: ProjectWorkspaceData;
  evaluationId: string;
}): ArtifactRecord[] {
  return filter(
    data.artifacts,
    (artifact) =>
      artifact.associated_entity_kind === "evaluation" &&
      artifact.associated_entity_id === evaluationId,
  );
}
