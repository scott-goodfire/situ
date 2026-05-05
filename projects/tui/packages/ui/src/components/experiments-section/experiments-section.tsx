import lodash from "lodash";
import { Text } from "ink";
import type { ExperimentActivityRecord, ExperimentRecord } from "@almanac/protocol";
import { Section } from "../section/section.js";

export function ExperimentsSection({
  experiments,
  experimentActivities,
}: {
  experiments: ExperimentRecord[];
  experimentActivities: ExperimentActivityRecord[];
}) {
  const visibleExperiments = experiments.slice(-8);

  return (
    <Section title="Experiments">
      {visibleExperiments.length === 0 && <Text dimColor>None yet</Text>}
      {visibleExperiments.map((experiment) => (
        <Text key={experiment.id}>
          {formatExperiment({ experiment, experimentActivities })}
        </Text>
      ))}
    </Section>
  );
}

function formatExperiment({
  experiment,
  experimentActivities,
}: {
  experiment: ExperimentRecord;
  experimentActivities: ExperimentActivityRecord[];
}): string {
  const latestActivity = latestExperimentActivity({
    experimentId: experiment.id,
    experimentActivities,
  });
  const note = latestActivity?.body ?? experiment.summary;
  const concern = hasConcern({ experimentId: experiment.id, experimentActivities })
    ? " concern"
    : "";

  return `${experiment.id} | ${experiment.status}${concern} | ${experiment.title} | ${note}`;
}

function latestExperimentActivity({
  experimentId,
  experimentActivities,
}: {
  experimentId: string;
  experimentActivities: ExperimentActivityRecord[];
}): ExperimentActivityRecord | undefined {
  return lodash.findLast(
    experimentActivities,
    (activity) => activity.experiment_id === experimentId,
  );
}

function hasConcern({
  experimentId,
  experimentActivities,
}: {
  experimentId: string;
  experimentActivities: ExperimentActivityRecord[];
}): boolean {
  return lodash.some(
    experimentActivities,
    (activity) =>
      activity.experiment_id === experimentId &&
      activity.payload?.activity_type === "concern",
  );
}
