import { Text } from "ink";
import type { ExperimentRecord, SessionRecord } from "@almanac/protocol";
import { Section } from "../section/section.js";

export function NowSection({
  activeExperiment,
  latestSession,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestSession: SessionRecord | undefined;
}) {
  return (
    <Section title="Now">
      <Text>{nowLabel({ activeExperiment, latestSession })}</Text>
    </Section>
  );
}

function nowLabel({
  activeExperiment,
  latestSession,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestSession: SessionRecord | undefined;
}): string {
  if (activeExperiment) {
    return `${activeExperiment.id} | ${activeExperiment.title}`;
  }

  if (latestSession?.status === "closed") {
    return "Session closed";
  }

  return "Waiting for experiment";
}
