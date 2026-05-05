import type { EventRecord, ExperimentRecord, RunRecord } from "@almanac/protocol";
import { DxNotice } from "@almanac/web-ui";
import filter from "lodash/filter";
import { ConnectionBadge, type ConnectionState } from "./connection-badge";
import { EventTimeline } from "./event-timeline";
import { ExperimentTable } from "./experiment-table";
import { NoActiveHarness } from "./no-active-harness";
import { NowPanel } from "./now-panel";
import { RunSummary } from "./run-summary";

export { type ConnectionState };

export function AlmanacMonitor({
  workspace,
  connection,
  runs,
  experiments,
  events,
}: {
  workspace: string | undefined;
  connection: ConnectionState;
  runs: RunRecord[];
  experiments: ExperimentRecord[];
  events: EventRecord[];
}) {
  if (connection.kind === "missing") {
    return <NoActiveHarness workspace={workspace} />;
  }

  const latestRun = runs.at(-1);
  const runExperiments = experimentsForRun({
    experiments,
    run: latestRun,
  });
  const activeExperiment = runExperiments.find((experiment) => experiment.status === "running");

  return (
    <main className="almanac-shell">
      <header className="almanac-topbar">
        <div>
          <h1>Almanac</h1>
          <p>{workspace ?? "Local workspace"}</p>
        </div>
        <ConnectionBadge state={connection} />
      </header>

      {connection.kind === "failed" && (
        <DxNotice tone="danger">{connection.message}</DxNotice>
      )}

      <RunSummary run={latestRun} experimentCount={runExperiments.length} />
      <NowPanel activeExperiment={activeExperiment} latestRun={latestRun} />
      <ExperimentTable experiments={runExperiments} />
      <EventTimeline events={events} />
    </main>
  );
}

function experimentsForRun({
  experiments,
  run,
}: {
  experiments: ExperimentRecord[];
  run: RunRecord | undefined;
}): ExperimentRecord[] {
  if (!run) {
    return [];
  }

  return filter(experiments, (experiment) => experiment.run_id === run.id);
}
