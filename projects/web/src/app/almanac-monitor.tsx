import type { EventRecord, ExperimentRecord, RunRecord } from "@almanac/protocol";
import { ConnectionBadge, type ConnectionState } from "../components/connection-badge";
import { EventTimeline } from "../components/event-timeline";
import { ExperimentTable } from "../components/experiment-table";
import { NowPanel } from "../components/now-panel";
import { RunSummary } from "../components/run-summary";

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
    return <NoSession workspace={workspace} />;
  }

  const latestRun = runs.at(-1);
  const runExperiments = experimentsForRun({
    experiments,
    run: latestRun,
  });
  const activeExperiment = runExperiments.find((experiment) => experiment.status === "running");

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Almanac</h1>
          <p>{workspace ?? "Local workspace"}</p>
        </div>
        <ConnectionBadge state={connection} />
      </header>

      {connection.kind === "failed" && <div className="notice">{connection.message}</div>}

      <RunSummary run={latestRun} experimentCount={runExperiments.length} />
      <NowPanel activeExperiment={activeExperiment} latestRun={latestRun} />
      <ExperimentTable experiments={runExperiments} />
      <EventTimeline events={events} />
    </main>
  );
}

function NoSession({ workspace }: { workspace: string | undefined }) {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Almanac</h1>
          <p>{workspace ?? "Local workspace"}</p>
        </div>
        <span className="badge">No session</span>
      </header>
      <section className="empty">
        <h2>No active Almanac harness found</h2>
        <p>Start a session from a terminal, then reopen this web monitor.</p>
        <pre>almanac start</pre>
      </section>
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

  return experiments.filter((experiment) => experiment.run_id === run.id);
}
