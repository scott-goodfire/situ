import { Text } from "ink";
import type { RunRecord } from "@almanac/protocol";
import { Section } from "../section/section.js";

export function RunSection({
  run,
  experimentCount,
  maxExperiments,
}: {
  run: RunRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}) {
  return (
    <Section title="Run">
      <Text>{runLabel({ run, experimentCount, maxExperiments })}</Text>
    </Section>
  );
}

function runLabel({
  run,
  experimentCount,
  maxExperiments,
}: {
  run: RunRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
}): string {
  if (!run) {
    return "No run yet";
  }

  return `${run.id} | ${run.status} | experiments ${experimentCount}/${maxExperiments}`;
}
