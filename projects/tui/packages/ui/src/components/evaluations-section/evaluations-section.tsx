import lodash from "lodash";
import { Text } from "ink";
import type {
  EvaluationActivityRecord,
  EvaluationRecord,
} from "@almanac/protocol";
import { Section } from "../section/section.js";
import { previewText } from "../text-preview/text-preview.js";

export function EvaluationsSection({
  evaluations,
  evaluationActivities,
}: {
  evaluations: EvaluationRecord[];
  evaluationActivities: EvaluationActivityRecord[];
}) {
  const visibleEvaluations = evaluations.slice(-8);

  return (
    <Section title="Evaluations">
      {visibleEvaluations.length === 0 && <Text dimColor>None yet</Text>}
      {visibleEvaluations.map((evaluation) => (
        <Text key={evaluation.id}>
          {formatEvaluation({ evaluation, evaluationActivities })}
        </Text>
      ))}
    </Section>
  );
}

function formatEvaluation({
  evaluation,
  evaluationActivities,
}: {
  evaluation: EvaluationRecord;
  evaluationActivities: EvaluationActivityRecord[];
}): string {
  const latestActivity = latestEvaluationActivity({
    evaluationId: evaluation.id,
    evaluationActivities,
  });
  const note = latestActivity?.body ?? evaluation.summary;
  const concern = (() => {
    if (hasConcern({ evaluationId: evaluation.id, evaluationActivities })) {
      return " concern";
    }

    return "";
  })();
  const experiment = (() => {
    if (!evaluation.associated_experiment_id) {
      return "baseline";
    }

    return evaluation.associated_experiment_id;
  })();
  const preview = previewText({
    value: note,
    maxCharacters: 150,
  });

  return `${evaluation.id} | ${evaluation.status}${concern} | ${experiment} | ${preview}`;
}

function latestEvaluationActivity({
  evaluationId,
  evaluationActivities,
}: {
  evaluationId: string;
  evaluationActivities: EvaluationActivityRecord[];
}): EvaluationActivityRecord | undefined {
  return lodash.findLast(
    evaluationActivities,
    (activity) => activity.evaluation_id === evaluationId,
  );
}

function hasConcern({
  evaluationId,
  evaluationActivities,
}: {
  evaluationId: string;
  evaluationActivities: EvaluationActivityRecord[];
}): boolean {
  return lodash.some(
    evaluationActivities,
    (activity) =>
      activity.evaluation_id === evaluationId &&
      activity.payload?.activity_type === "concern",
  );
}
