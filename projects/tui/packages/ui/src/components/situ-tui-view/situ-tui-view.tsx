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
} from "@situ/protocol";
import {
  type DashboardCommand,
  type DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import { FullscreenDashboard } from "../fullscreen-dashboard/fullscreen-dashboard.js";

export function SituTuiView({
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
    <FullscreenDashboard
      workspace={workspace}
      statusLine={statusLine}
      dashboardMessage={dashboardMessage}
      objective={objective}
      researchContext={researchContext}
      session={session}
      experimentCount={experimentCount}
      maxExperiments={maxExperiments}
      hypotheses={hypotheses}
      experiments={experiments}
      evaluations={evaluations}
      hypothesisActivities={hypothesisActivities}
      experimentActivities={experimentActivities}
      evaluationActivities={evaluationActivities}
      onDashboardCommand={onDashboardCommand}
    />
  );
}
