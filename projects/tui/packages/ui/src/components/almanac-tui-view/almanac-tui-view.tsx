import type {
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ObjectiveRecord,
  ResearchContextRecord,
  SessionRecord,
} from "@almanac/protocol";
import { ActivitySection } from "../activity-section/activity-section.js";
import { AppFrame } from "../app-frame/app-frame.js";
import {
  DashboardControls,
  type DashboardCommand,
  type DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import { EvaluationsSection } from "../evaluations-section/evaluations-section.js";
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
  researchContext,
  session,
  experimentCount,
  maxExperiments,
  activeExperiment,
  hypotheses,
  experiments,
  evaluations,
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
  events,
  onDashboardCommand,
}: {
  workspace: string;
  statusLine: string;
  dashboardMessage: DashboardControlMessage | undefined;
  objective: ObjectiveRecord | undefined;
  researchContext?: ResearchContextRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  maxExperiments: number;
  activeExperiment: ExperimentRecord | undefined;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
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
        researchContext={researchContext}
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
      <EvaluationsSection
        evaluations={evaluations}
        evaluationActivities={evaluationActivities}
      />
      <ActivitySection
        hypothesisActivities={hypothesisActivities}
        experimentActivities={experimentActivities}
        evaluationActivities={evaluationActivities}
      />
      <TimelineSection events={events} />
    </AppFrame>
  );
}
