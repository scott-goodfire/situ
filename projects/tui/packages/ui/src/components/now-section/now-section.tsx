import { Text } from "ink";
import type { ExperimentRecord, SessionRecord } from "@situ/protocol";
import { PaneSection } from "../pane-section/pane-section.js";

export function NowSection({
  activeExperiment,
  latestSession,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestSession: SessionRecord | undefined;
}) {
  return (
    <PaneSection title="Now">
      <Text>{nowLabel({ activeExperiment, latestSession })}</Text>
    </PaneSection>
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
