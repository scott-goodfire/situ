import type { ExperimentRecord, RunRecord } from "@almanac/protocol";

export function NowPanel({
  activeExperiment,
  latestRun,
}: {
  activeExperiment: ExperimentRecord | undefined;
  latestRun: RunRecord | undefined;
}) {
  return (
    <section className="band">
      <h2>Now</h2>
      <p>{nowLabel({ activeExperiment, latestRun })}</p>
    </section>
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
