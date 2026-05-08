import type {
  EvaluationActivityRecord,
  EvaluationRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
import type { DxBadgeTone, DxTableRowTone } from "@situ/web-ui";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export type EvidenceState = "missing" | "waiting" | "present";

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

  return "present";
}

export function evidenceTone({ state }: { state: EvidenceState }): DxBadgeTone {
  if (state === "present") {
    return "success";
  }

  return "neutral";
}

export function evidenceRowTone({
  activity: _activity,
}: {
  activity: EvaluationActivityRecord;
}): DxTableRowTone {
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

  if (evaluationCount === 1 && activityCount === 1) {
    return "1 result";
  }

  if (evaluationCount === 1) {
    return `${activityCount} results`;
  }

  return `${evaluationCount} evaluations`;
}

export function activityLabel({
  activity,
}: {
  activity: EvaluationActivityRecord;
}): string {
  if (activity.kind === "recorded") {
    const recordType = activity.payload?.record_type;
    if (typeof recordType === "string" && recordType.length > 0) {
      return recordType.replace(/_/g, " ");
    }
    return "recorded";
  }

  return activity.kind;
}
