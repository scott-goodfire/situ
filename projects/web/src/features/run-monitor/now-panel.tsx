import type { ExperimentRecord, RunRecord } from "@almanac/protocol";
import { DxSection } from "@almanac/web-ui";

export function NowPanel({
  activeExperiment,
  latestRun,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestRun: RunRecord | undefined;
}) {
  return (
    <DxSection title="Now">
      <p>{nowLabel({ activeExperiment, latestRun })}</p>
    </DxSection>
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

  return "Waiting for experiment";
}
