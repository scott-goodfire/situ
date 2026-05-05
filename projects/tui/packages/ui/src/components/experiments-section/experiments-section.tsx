import { Text } from "ink";
import type { ExperimentRecord } from "@almanac/protocol";
import { Section } from "../section/section.js";

export function ExperimentsSection({
  experiments,
}: {
  experiments: ExperimentRecord[];
}) {
  const visibleExperiments = experiments.slice(-8);

  return (
    <Section title="Experiments">
      {visibleExperiments.length === 0 && <Text dimColor>None yet</Text>}
      {visibleExperiments.map((experiment) => (
        <Text key={experiment.id}>{formatExperiment({ experiment })}</Text>
      ))}
    </Section>
  );
}

function formatExperiment({ experiment }: { experiment: ExperimentRecord }): string {
  const state = experimentState({ experiment });
  const components = experimentComponents({ experiment });
  const note = experiment.suspicious_reason ?? experiment.note;

  return `${experiment.id} | ${state} | ${components} | ${note || experiment.intent}`;
}

function experimentState({ experiment }: { experiment: ExperimentRecord }): string {
  if (experiment.suspicious) {
    return "suspicious";
  }

  return experiment.status;
}

function experimentComponents({ experiment }: { experiment: ExperimentRecord }): string {
  if (experiment.components.length === 0) {
    return "none";
  }

  return experiment.components.join("+");
}
