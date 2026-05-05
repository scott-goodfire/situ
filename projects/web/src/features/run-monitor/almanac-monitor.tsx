import type {
  EventRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";
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
  objectives,
  sessions,
  hypotheses,
  experiments,
  experimentActivities,
  events,
}: {
  workspace: string | undefined;
  connection: ConnectionState;
  objectives: ObjectiveRecord[];
  sessions: SessionRecord[];
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  experimentActivities: ExperimentActivityRecord[];
  events: EventRecord[];
}) {
  if (connection.kind === "missing") {
    return <NoActiveHarness workspace={workspace} />;
  }

  const activeObjective = objectives.find((objective) => objective.status === "active");
  const latestSession = sessions.at(-1);
  const sessionExperiments = experimentsForSession({
    experiments,
    session: latestSession,
  });
  const activeExperiment = sessionExperiments.find(
    (experiment) => experiment.status === "active",
  );
  const objectiveHypotheses = hypothesesForObjective({
    hypotheses,
    objective: activeObjective,
  });

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

      <RunSummary
        objective={activeObjective}
        session={latestSession}
        experimentCount={sessionExperiments.length}
        hypothesisCount={objectiveHypotheses.length}
      />
      <NowPanel activeExperiment={activeExperiment} latestSession={latestSession} />
      <ExperimentTable
        experiments={sessionExperiments}
        experimentActivities={experimentActivities}
      />
      <EventTimeline events={events} />
    </main>
  );
}

function experimentsForSession({
  experiments,
  session,
}: {
  experiments: ExperimentRecord[];
  session: SessionRecord | undefined;
}): ExperimentRecord[] {
  if (!session) {
    return [];
  }

  return filter(
    experiments,
    (experiment) => experiment.created_in_session_id === session.id,
  );
}

function hypothesesForObjective({
  hypotheses,
  objective,
}: {
  hypotheses: HypothesisRecord[];
  objective: ObjectiveRecord | undefined;
}): HypothesisRecord[] {
  if (!objective) {
    return [];
  }

  return filter(
    hypotheses,
    (hypothesis) => hypothesis.objective_id === objective.id,
  );
}
