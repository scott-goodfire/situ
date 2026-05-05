import lodash from "lodash";
import { Text } from "ink";
import type {
  ExperimentActivityRecord,
  HypothesisActivityRecord,
} from "@almanac/protocol";
import { Section } from "../section/section.js";
import { previewText } from "../text-preview/text-preview.js";

type Activity =
  | ({ scope: "hypothesis" } & HypothesisActivityRecord)
  | ({ scope: "experiment" } & ExperimentActivityRecord);

export function ActivitySection({
  hypothesisActivities,
  experimentActivities,
}: {
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
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
      ],
      [(activity) => activity.created_at, (activity) => activity.id],
      ["asc", "asc"],
    )
    .slice(-8);

  return (
    <Section title="Activity">
      {activities.length === 0 && <Text dimColor>None yet</Text>}
      {activities.map((activity) => (
        <Text key={`${activity.scope}-${activity.id}`}>
          {formatActivity({ activity })}
        </Text>
      ))}
    </Section>
  );
}

function formatActivity({ activity }: { activity: Activity }): string {
  const target = (() => {
    if (activity.scope === "hypothesis") {
      return activity.hypothesis_id;
    }

    return activity.experiment_id;
  })();
  const preview = previewText({
    value: activity.body,
    maxCharacters: 150,
  });

  return `${activity.kind} | ${target} | ${preview}`;
}
