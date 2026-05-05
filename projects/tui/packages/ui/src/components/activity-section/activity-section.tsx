import lodash from "lodash";
import { Text } from "ink";
import type {
  EvaluationActivityRecord,
  ExperimentActivityRecord,
  HypothesisActivityRecord,
} from "@situ/protocol";
import { PaneSection } from "../pane-section/pane-section.js";
import { previewText } from "../text-preview/text-preview.js";

type Activity =
  | ({ scope: "hypothesis" } & HypothesisActivityRecord)
  | ({ scope: "experiment" } & ExperimentActivityRecord)
  | ({ scope: "evaluation" } & EvaluationActivityRecord);

export function ActivitySection({
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
}: {
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
}) {
  const activities = lodash
    .orderBy(
      [
        ...hypothesisActivities.map((activity) => ({
          ...activity,
          scope: "hypothesis" as const,
        })),
        ...experimentActivities.map((activity) => ({
          ...activity,
          scope: "experiment" as const,
        })),
        ...evaluationActivities.map((activity) => ({
          ...activity,
          scope: "evaluation" as const,
        })),
      ],
      [(activity) => activity.created_at, (activity) => activity.id],
      ["asc", "asc"],
    )
    .slice(-8);

  return (
    <PaneSection title="Activity">
      {activities.length === 0 && <Text dimColor>None yet</Text>}
      {activities.map((activity) => (
        <Text key={`${activity.scope}-${activity.id}`}>
          {formatActivity({ activity })}
        </Text>
      ))}
    </PaneSection>
  );
}

function formatActivity({ activity }: { activity: Activity }): string {
  const target = (() => {
    if (activity.scope === "hypothesis") {
      return activity.hypothesis_id;
    }

    if (activity.scope === "evaluation") {
      return activity.evaluation_id;
    }

    return activity.experiment_id;
  })();
  const preview = previewText({
    value: activity.body,
    maxCharacters: 150,
  });

  return `${activity.kind} | ${target} | ${preview}`;
}
