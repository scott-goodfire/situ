import { Text } from "ink";
import type { HypothesisRecord } from "@almanac/protocol";
import { Section } from "../section/section.js";

export function HypothesesSection({
  hypotheses,
}: {
  hypotheses: HypothesisRecord[];
}) {
  const visibleHypotheses = hypotheses.slice(-5);

  return (
    <Section title="Hypotheses">
      {visibleHypotheses.length === 0 && <Text dimColor>None yet</Text>}
      {visibleHypotheses.map((hypothesis) => (
        <Text key={hypothesis.id}>
          {hypothesis.id} | {hypothesis.status} | {hypothesis.title}
        </Text>
      ))}
    </Section>
  );
}
