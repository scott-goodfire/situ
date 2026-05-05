import type {
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentRecord,
  SessionRecord,
} from "@almanac/protocol";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
import type { DxBadgeTone, DxTableRowTone } from "@almanac/web-ui";
import type { ProjectWorkspaceData } from "../types";

export type EvidenceState = "missing" | "waiting" | "present" | "concern";

export function baselineEvaluations({
  data,
  session,
}: {
  data: ProjectWorkspaceData;
  session: SessionRecord | undefined;
}): EvaluationRecord[] {
  if (!session) {
    return [];
  }

  return filter(
    data.evaluations,
    (evaluation) =>
      evaluation.session_id === session.id && !evaluation.associated_experiment_id,
  );
}

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

export function evaluationActivitiesForEvaluation({
  data,
  evaluationId,
}: {
  data: ProjectWorkspaceData;
  evaluationId: string;
}): EvaluationActivityRecord[] {
  return filter(
    data.evaluationActivities,
    (activity) => activity.evaluation_id === evaluationId,
  );
}

export function evaluationActivitiesForEvaluations({
  data,
  evaluations,
}: {
  data: ProjectWorkspaceData;
  evaluations: EvaluationRecord[];
}): EvaluationActivityRecord[] {
  const evaluationIds = new Set(evaluations.map((evaluation) => evaluation.id));

  return filter(data.evaluationActivities, (activity) =>
    evaluationIds.has(activity.evaluation_id),
  );
}

export function recentEvaluationActivities({
  data,
  limit,
}: {
  data: ProjectWorkspaceData;
  limit: number;
}): EvaluationActivityRecord[] {
  return orderBy(
    data.evaluationActivities,
    [(activity) => activity.created_at, (activity) => activity.id],
    ["desc", "desc"],
  ).slice(0, limit);
}

export function latestEvaluationActivity({
  activities,
}: {
  activities: EvaluationActivityRecord[];
}): EvaluationActivityRecord | undefined {
  return orderBy(
    activities,
    [(activity) => activity.created_at, (activity) => activity.id],
    ["asc", "asc"],
  ).at(-1);
}

export function evidenceState({
  evaluations,
  activities,
}: {
  evaluations: EvaluationRecord[];
  activities: EvaluationActivityRecord[];
}): EvidenceState {
  if (evaluations.length === 0) {
    return "missing";
  }

  if (activities.length === 0) {
    return "waiting";
  }

  if (activities.some((activity) => isConcernActivity({ activity }))) {
    return "concern";
  }

  return "present";
}

export function evidenceTone({ state }: { state: EvidenceState }): DxBadgeTone {
  if (state === "concern") {
    return "warning";
  }

  if (state === "present") {
    return "success";
  }

  return "neutral";
}

export function evidenceRowTone({
  activity,
}: {
  activity: EvaluationActivityRecord;
}): DxTableRowTone {
  if (isConcernActivity({ activity })) {
    return "warning";
  }

  return "neutral";
}

export function evidenceLabel({
  state,
  evaluationCount,
  activityCount,
}: {
  state: EvidenceState;
  evaluationCount: number;
  activityCount: number;
}): string {
  if (state === "missing") {
    return "missing";
  }

  if (state === "waiting") {
    return "waiting";
  }

  if (state === "concern") {
    return "needs attention";
  }

  if (evaluationCount === 1 && activityCount === 1) {
    return "1 result";
  }

  if (evaluationCount === 1) {
    return `${activityCount} results`;
  }

  return `${evaluationCount} evaluations`;
}

export function evaluationForActivity({
  data,
  activity,
}: {
  data: ProjectWorkspaceData;
  activity: EvaluationActivityRecord;
}): EvaluationRecord | undefined {
  return data.evaluations.find(
    (evaluation) => evaluation.id === activity.evaluation_id,
  );
}

export function sessionLabel({
  session,
}: {
  session: SessionRecord | undefined;
}): string {
  if (!session) {
    return "No session";
  }

  return `${session.id} / ${session.status}`;
}

export function activityLabel({
  activity,
}: {
  activity: EvaluationActivityRecord;
}): string {
  const activityType = activity.payload?.activity_type;

  if (typeof activityType === "string" && activityType.length > 0) {
    return activityType;
  }

  return activity.kind;
}

export function isConcernActivity({
  activity,
}: {
  activity: EvaluationActivityRecord;
}): boolean {
  const searchableText = `${activityLabel({ activity })} ${activity.body}`.toLowerCase();
  const concernMarkers = [
    "blocked",
    "concern",
    "error",
    "fail",
    "invalid",
    "missing",
    "suspicious",
  ];

  return concernMarkers.some((marker) => searchableText.includes(marker));
}
