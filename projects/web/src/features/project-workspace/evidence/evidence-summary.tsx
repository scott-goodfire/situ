import type {
  EvaluationActivityRecord,
  EvaluationRecord,
} from "@almanac/protocol";
import { DxBadge } from "@almanac/web-ui";
import {
  evidenceLabel,
  evidenceState,
  evidenceTone,
  latestEvaluationActivity,
} from "./evaluation-selectors";

export function EvidenceSummary({
  evaluations,
  activities,
  missingLabel = "No evidence yet",
}: {
  evaluations: EvaluationRecord[];
  activities: EvaluationActivityRecord[];
  missingLabel?: string;
}) {
  const state = evidenceState({
    evaluations,
    activities,
  });
  const latestActivity = latestEvaluationActivity({ activities });
  const label = evidenceLabel({
    state,
    evaluationCount: evaluations.length,
    activityCount: activities.length,
  });

  return (
    <div className="almanac-evidence-summary">
      <DxBadge tone={evidenceTone({ state })}>{label}</DxBadge>
      <span className="almanac-evidence-summary__text">
        {latestActivity?.body ?? missingLabel}
      </span>
    </div>
  );
}
