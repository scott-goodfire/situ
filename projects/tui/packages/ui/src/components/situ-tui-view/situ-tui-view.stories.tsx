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
  ObjectiveRecord,
  ResearchContextRecord,
  SessionRecord,
} from "@situ/protocol";
import { SituTuiView } from "./situ-tui-view.js";
import type {
  DashboardCommand,
  DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import {
  acceptedExperiment,
  activeHypothesis,
  activeObjective,
  activeResearchContext,
  completedEvents,
  completedEvaluations,
  completedExperiments,
  completedSession,
  maxExperimentCount,
  runningEvaluationActivities,
  runningEvaluations,
  runningEvents,
  runningExperiment,
  runningExperimentActivities,
  runningExperiments,
  runningHypothesisActivities,
  runningSession,
  storyWorkspace,
  suspiciousEvaluationActivities,
  suspiciousEvaluations,
  suspiciousEvents,
  suspiciousExperiment,
  suspiciousExperimentActivities,
  suspiciousExperiments,
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
        objective={activeObjective}
        researchContext={activeResearchContext}
        session={undefined}
        experimentCount={0}
        activeExperiment={undefined}
        hypotheses={[]}
        experiments={[]}
        evaluations={[]}
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
        statusLine="session_0001 | active | experiments 3/5"
        objective={activeObjective}
        researchContext={activeResearchContext}
        session={runningSession}
        experimentCount={runningExperiments.length}
        activeExperiment={runningExperiment}
        hypotheses={[activeHypothesis]}
        experiments={runningExperiments}
        evaluations={runningEvaluations}
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
        statusLine="session_0001 | active | experiments 3/5"
        objective={activeObjective}
        researchContext={activeResearchContext}
        session={runningSession}
        experimentCount={suspiciousExperiments.length}
        activeExperiment={undefined}
        hypotheses={[activeHypothesis]}
        experiments={suspiciousExperiments}
        evaluations={suspiciousEvaluations}
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
        statusLine="session_0001 | closed | experiments 2/5"
        objective={activeObjective}
        researchContext={activeResearchContext}
        session={completedSession}
        experimentCount={completedExperiments.length}
        activeExperiment={undefined}
        hypotheses={[activeHypothesis]}
        experiments={completedExperiments}
        evaluations={completedEvaluations}
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
        statusLine="Session session_0001 failed"
        objective={activeObjective}
        researchContext={activeResearchContext}
        session={runningSession}
        experimentCount={suspiciousExperiments.length}
        activeExperiment={suspiciousExperiment}
        hypotheses={[activeHypothesis]}
        experiments={[acceptedExperiment, suspiciousExperiment]}
        evaluations={suspiciousEvaluations}
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
  objective: ObjectiveRecord | undefined;
  researchContext?: ResearchContextRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  activeExperiment: ExperimentRecord | undefined;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  evaluations: EvaluationRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  evaluationActivities: EvaluationActivityRecord[];
  events: EventRecord[];
};

function StorySituTuiView({
  statusLine,
  objective,
  researchContext,
  session,
  experimentCount,
  activeExperiment,
  hypotheses,
  experiments,
  evaluations,
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
      objective={objective}
      researchContext={researchContext}
      session={session}
      experimentCount={experimentCount}
      maxExperiments={maxExperimentCount}
      activeExperiment={activeExperiment}
      hypotheses={hypotheses}
      experiments={experiments}
      evaluations={evaluations}
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
