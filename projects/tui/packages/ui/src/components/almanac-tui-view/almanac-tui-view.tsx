import type {
  EventRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";
import { ActivitySection } from "../activity-section/activity-section.js";
import { AppFrame } from "../app-frame/app-frame.js";
import {
  DashboardControls,
  type DashboardCommand,
  type DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import { ExperimentsSection } from "../experiments-section/experiments-section.js";
import { HypothesesSection } from "../hypotheses-section/hypotheses-section.js";
import { NowSection } from "../now-section/now-section.js";
import { SessionSection } from "../session-section/session-section.js";
import { TimelineSection } from "../timeline-section/timeline-section.js";

export function AlmanacTuiView({
  workspace,
  statusLine,
  dashboardMessage,
  objective,
  session,
  experimentCount,
  maxExperiments,
  activeExperiment,
  hypotheses,
  experiments,
  hypothesisActivities,
  experimentActivities,
  events,
  onDashboardCommand,
}: {
  workspace: string;
  statusLine: string;
  dashboardMessage: DashboardControlMessage | undefined;
  objective: ObjectiveRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  activeExperiment: ExperimentRecord | undefined;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  events: EventRecord[];
  onDashboardCommand: ({ command }: { command: DashboardCommand }) => void;
}) {
  return (
    <AppFrame
      workspace={workspace}
      statusLine={statusLine}
      footer={
        <DashboardControls
          message={dashboardMessage}
          onCommand={onDashboardCommand}
        />
      }
    >
      <SessionSection
        objective={objective}
        session={session}
        experimentCount={experimentCount}
        maxExperiments={maxExperiments}
      />
      <NowSection activeExperiment={activeExperiment} latestSession={session} />
      <HypothesesSection hypotheses={hypotheses} />
      <ExperimentsSection
        experiments={experiments}
        experimentActivities={experimentActivities}
      />
      <ActivitySection
        hypothesisActivities={hypothesisActivities}
        experimentActivities={experimentActivities}
      />
      <TimelineSection events={events} />
    </AppFrame>
  );
}
