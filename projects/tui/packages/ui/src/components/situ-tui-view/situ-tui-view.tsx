import type {
  EventRecord,
  EvaluationActivityRecord,
  EvaluationRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ProjectRecord,
  SessionRecord,
  TaskActivityRecord,
  TaskEntityLinkRecord,
  TaskRecord,
} from "@situ/protocol";
import {
  type DashboardCommand,
  type DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import {
  FullscreenDashboard,
  type DashboardTaskLoaderKind,
} from "../fullscreen-dashboard/fullscreen-dashboard.js";

export function SituTuiView({
  workspace,
  statusLine,
  dashboardMessage,
  project,
  session,
  tasks,
  experimentCount,
  maxExperiments,
  hypotheses,
  experiments,
  evaluations,
  taskEntityLinks = [],
  taskActivities,
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
  events,
  onDashboardCommand,
  taskLoaderKind,
}: {
  workspace: string;
  statusLine: string;
  dashboardMessage: DashboardControlMessage | undefined;
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
  tasks: TaskRecord[];
  experimentCount: number;
  maxExperiments: number;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  taskEntityLinks?: TaskEntityLinkRecord[];
  taskActivities: TaskActivityRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  events: EventRecord[];
  onDashboardCommand: ({ command }: { command: DashboardCommand }) => void;
  taskLoaderKind?: DashboardTaskLoaderKind;
}) {
  return (
    <FullscreenDashboard
      workspace={workspace}
      statusLine={statusLine}
      dashboardMessage={dashboardMessage}
      project={project}
      session={session}
      tasks={tasks}
      experimentCount={experimentCount}
      maxExperiments={maxExperiments}
      hypotheses={hypotheses}
      experiments={experiments}
      evaluations={evaluations}
      taskEntityLinks={taskEntityLinks}
      taskActivities={taskActivities}
      hypothesisActivities={hypothesisActivities}
      experimentActivities={experimentActivities}
      evaluationActivities={evaluationActivities}
      events={events}
      onDashboardCommand={onDashboardCommand}
      taskLoaderKind={taskLoaderKind}
    />
  );
}
