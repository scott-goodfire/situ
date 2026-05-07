import { useState } from "react";
import { useApp } from "ink";
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
import { SituTuiView } from "./situ-tui-view.js";
import type {
  DashboardCommand,
  DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import {
  acceptedExperiment,
  activeHypothesis,
  activeProject,
  completedEvents,
  completedEvaluations,
  completedExperiments,
  completedSession,
  completedTaskActivities,
  completedTasks,
  maxExperimentCount,
  runningEvaluationActivities,
  runningEvaluations,
  runningEvents,
  runningExperiment,
  runningExperimentActivities,
  runningExperiments,
  runningHypothesisActivities,
  runningSession,
  runningTaskActivities,
  runningTaskEntityLinks,
  runningTasks,
  storyWorkspace,
  suspiciousEvaluationActivities,
  suspiciousEvaluations,
  suspiciousEvents,
  suspiciousExperiment,
  suspiciousExperimentActivities,
  suspiciousExperiments,
  suspiciousTaskActivities,
  suspiciousTasks,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "situ-tui-view/no-session",
    title: "Situ TUI View",
    name: "no-session",
    render: () => (
      <StorySituTuiView
        statusLine="Connecting to local session..."
        project={activeProject}
        session={undefined}
        tasks={[]}
        experimentCount={0}
        hypotheses={[]}
        experiments={[]}
        evaluations={[]}
        taskActivities={[]}
        hypothesisActivities={[]}
        experimentActivities={[]}
        evaluationActivities={[]}
        events={[]}
      />
    ),
  },
  {
    id: "situ-tui-view/running",
    title: "Situ TUI View",
    name: "running",
    render: () => (
      <StorySituTuiView
        statusLine="S1 | active | experiments 3/5"
        project={activeProject}
        session={runningSession}
        tasks={runningTasks}
        experimentCount={runningExperiments.length}
        hypotheses={[activeHypothesis]}
        experiments={runningExperiments}
        evaluations={runningEvaluations}
        taskEntityLinks={runningTaskEntityLinks}
        taskActivities={runningTaskActivities}
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={runningExperimentActivities}
        evaluationActivities={runningEvaluationActivities}
        events={runningEvents}
      />
    ),
  },
  {
    id: "situ-tui-view/suspicious",
    title: "Situ TUI View",
    name: "suspicious",
    render: () => (
      <StorySituTuiView
        statusLine="S1 | active | experiments 3/5"
        project={activeProject}
        session={runningSession}
        tasks={suspiciousTasks}
        experimentCount={suspiciousExperiments.length}
        hypotheses={[activeHypothesis]}
        experiments={suspiciousExperiments}
        evaluations={suspiciousEvaluations}
        taskActivities={suspiciousTaskActivities}
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={suspiciousExperimentActivities}
        evaluationActivities={suspiciousEvaluationActivities}
        events={suspiciousEvents}
      />
    ),
  },
  {
    id: "situ-tui-view/completed",
    title: "Situ TUI View",
    name: "completed",
    render: () => (
      <StorySituTuiView
        statusLine="S1 | closed | experiments 2/5"
        project={activeProject}
        session={completedSession}
        tasks={completedTasks}
        experimentCount={completedExperiments.length}
        hypotheses={[activeHypothesis]}
        experiments={completedExperiments}
        evaluations={completedEvaluations}
        taskEntityLinks={runningTaskEntityLinks}
        taskActivities={completedTaskActivities}
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={runningExperimentActivities}
        evaluationActivities={runningEvaluationActivities}
        events={completedEvents}
      />
    ),
  },
  {
    id: "situ-tui-view/failed",
    title: "Situ TUI View",
    name: "failed",
    render: () => (
      <StorySituTuiView
        statusLine="Session S1 failed"
        project={activeProject}
        session={runningSession}
        tasks={suspiciousTasks}
        experimentCount={suspiciousExperiments.length}
        hypotheses={[activeHypothesis]}
        experiments={[acceptedExperiment, suspiciousExperiment]}
        evaluations={suspiciousEvaluations}
        taskActivities={suspiciousTaskActivities}
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={suspiciousExperimentActivities}
        evaluationActivities={suspiciousEvaluationActivities}
        events={suspiciousEvents}
      />
    ),
  },
] satisfies TuiStory[];

type StorySituTuiViewProps = {
  statusLine: string;
  project: ProjectRecord | undefined;
  session: SessionRecord | undefined;
  tasks: TaskRecord[];
  experimentCount: number;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  taskEntityLinks?: TaskEntityLinkRecord[];
  taskActivities: TaskActivityRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  events: EventRecord[];
};

function StorySituTuiView({
  statusLine,
  project,
  session,
  tasks,
  experimentCount,
  hypotheses,
  experiments,
  evaluations,
  taskEntityLinks = [],
  taskActivities,
  hypothesisActivities,
  experimentActivities,
  evaluationActivities,
  events,
}: StorySituTuiViewProps) {
  const { exit } = useApp();
  const [message, setMessage] = useState<DashboardControlMessage | undefined>(
    undefined,
  );

  return (
    <SituTuiView
      workspace={storyWorkspace}
      statusLine={statusLine}
      dashboardMessage={message}
      project={project}
      session={session}
      tasks={tasks}
      experimentCount={experimentCount}
      maxExperiments={maxExperimentCount}
      hypotheses={hypotheses}
      experiments={experiments}
      evaluations={evaluations}
      taskEntityLinks={taskEntityLinks}
      taskActivities={taskActivities}
      hypothesisActivities={hypothesisActivities}
      experimentActivities={experimentActivities}
      evaluationActivities={evaluationActivities}
      events={events}
      onDashboardCommand={({ command }) => {
        handleStoryDashboardCommand({
          command,
          statusLine,
          exit,
          setMessage,
        });
      }}
    />
  );
}

function handleStoryDashboardCommand({
  command,
  statusLine,
  exit,
  setMessage,
}: {
  command: DashboardCommand;
  statusLine: string;
  exit: () => void;
  setMessage: (value: DashboardControlMessage) => void;
}) {
  if (command === "quit") {
    exit();
    return;
  }

  if (command === "help") {
    setMessage({
      tone: "gray",
      text: "Keys: ? help, : commands, q quit.",
    });
    return;
  }

  setMessage({
    tone: "cyan",
    text: statusLine,
  });
}
