import type { ExperimentRecord, SessionRecord } from "@situ/protocol";
import { DxSection } from "@situ/web-ui";

export function NowPanel({
  activeExperiment,
  latestSession,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestSession: SessionRecord | undefined;
}) {
  return (
    <DxSection title="Now">
      <p>{nowLabel({ activeExperiment, latestSession })}</p>
    </DxSection>
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
