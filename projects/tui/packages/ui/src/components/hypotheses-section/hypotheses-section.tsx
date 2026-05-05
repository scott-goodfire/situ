import { Text } from "ink";
import type { HypothesisRecord } from "@situ/protocol";
import { PaneSection } from "../pane-section/pane-section.js";

export function HypothesesSection({
  hypotheses,
}: {
  hypotheses: HypothesisRecord[];
}) {
  const visibleHypotheses = hypotheses.slice(-5);

  return (
    <PaneSection title="Hypotheses">
      {visibleHypotheses.length === 0 && <Text dimColor>None yet</Text>}
      {visibleHypotheses.map((hypothesis) => (
        <Text key={hypothesis.id}>
          {hypothesis.id} | {hypothesis.status} | {hypothesis.title}
        </Text>
      ))}
    </PaneSection>
  );
}
