import { Text } from "ink";
import type { ExperimentRecord, RunRecord } from "@almanac/protocol";
import { Section } from "../section/section.js";

export function NowSection({
  activeExperiment,
  latestRun,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestRun: RunRecord | undefined;
}) {
  return (
    <Section title="Now">
      <Text>{nowLabel({ activeExperiment, latestRun })}</Text>
    </Section>
  );
}

function nowLabel({
  activeExperiment,
  latestRun,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestRun: RunRecord | undefined;
}): string {
  if (activeExperiment) {
    return `${activeExperiment.id} | ${activeExperiment.intent}`;
  }

  if (latestRun?.status === "completed") {
    return "Run completed";
  }

  if (latestRun?.status === "failed") {
    return "Run failed";
  }

  return "Waiting for experiment";
}
