import type {
  EvaluationRecord,
  ExperimentRecord,
  HypothesisRecord,
} from "@situ/protocol";
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

export function actorsForHypothesis({
  data,
  hypothesis,
  experiments,
  evaluations,
}: {
  data: ProjectWorkspaceData;
  hypothesis: HypothesisRecord;
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
}): string[] {
  const experimentIds = new Set(experiments.map((experiment) => experiment.id));
  const evaluationIds = new Set(evaluations.map((evaluation) => evaluation.id));
  const actors = new Set<string>();

  for (const activity of data.hypothesisActivities) {
    if (activity.hypothesis_id === hypothesis.id) {
      actors.add(activity.actor);
    }
  }

  for (const activity of data.experimentActivities) {
    if (experimentIds.has(activity.experiment_id)) {
      actors.add(activity.actor);
    }
  }

  for (const activity of data.evaluationActivities) {
    if (evaluationIds.has(activity.evaluation_id)) {
      actors.add(activity.actor);
    }
  }

  return Array.from(actors).sort((left, right) => left.localeCompare(right));
}
