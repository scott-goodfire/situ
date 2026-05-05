import type {
  EventRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";
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

  const latestSession = sessions.at(-1);
  const activeObjective = objectiveForSession({
    objectives,
    session: latestSession,
  });
  const sessionExperiments = experimentsForSession({
    experiments,
    session: latestSession,
  });
  const activeExperiment = sessionExperiments.find(
    (experiment) => experiment.status === "active",
  );
  const sessionHypotheses = hypothesesForSession({
    hypotheses,
    session: latestSession,
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
        <p className="almanac-status" data-tone="danger">{connection.message}</p>
      )}

      <RunSummary
        objective={activeObjective}
        session={latestSession}
        experimentCount={sessionExperiments.length}
        hypothesisCount={sessionHypotheses.length}
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
    (experiment) => experiment.associated_session_id === session.id,
  );
}

function objectiveForSession({
  objectives,
  session,
}: {
  objectives: ObjectiveRecord[];
  session: SessionRecord | undefined;
}): ObjectiveRecord | undefined {
  if (!session) {
    return undefined;
  }

  return objectives.find((objective) => objective.id === session.objective_id);
}

function hypothesesForSession({
  hypotheses,
  session,
}: {
  hypotheses: HypothesisRecord[];
  session: SessionRecord | undefined;
}): HypothesisRecord[] {
  if (!session) {
    return [];
  }

  return filter(
    hypotheses,
    (hypothesis) => hypothesis.associated_session_id === session.id,
  );
}
