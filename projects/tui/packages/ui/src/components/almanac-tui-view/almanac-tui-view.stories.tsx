import { useState } from "react";
import { useApp } from "ink";
import type {
  EventRecord,
  ExperimentActivityRecord,
  ExperimentRecord,
  HypothesisActivityRecord,
  HypothesisRecord,
  ObjectiveRecord,
  SessionRecord,
} from "@almanac/protocol";
import { AlmanacTuiView } from "./almanac-tui-view.js";
import type {
  DashboardCommand,
  DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import {
  acceptedExperiment,
  activeHypothesis,
  activeObjective,
  completedEvents,
  completedExperiments,
  completedSession,
  maxExperimentCount,
  runningEvents,
  runningExperiment,
  runningExperimentActivities,
  runningExperiments,
  runningHypothesisActivities,
  runningSession,
  storyWorkspace,
  suspiciousEvents,
  suspiciousExperiment,
  suspiciousExperimentActivities,
  suspiciousExperiments,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "almanac-tui-view/no-session",
    title: "Almanac TUI View",
    name: "no-session",
    render: () => (
      <StoryAlmanacTuiView
        statusLine="Connecting to local session..."
        objective={activeObjective}
        session={undefined}
        experimentCount={0}
        activeExperiment={undefined}
        hypotheses={[]}
        experiments={[]}
        hypothesisActivities={[]}
        experimentActivities={[]}
        events={[]}
      />
    ),
  },
  {
    id: "almanac-tui-view/running",
    title: "Almanac TUI View",
    name: "running",
    render: () => (
      <StoryAlmanacTuiView
        statusLine="session_0001 | active | experiments 3/5"
        objective={activeObjective}
        session={runningSession}
        experimentCount={runningExperiments.length}
        activeExperiment={runningExperiment}
        hypotheses={[activeHypothesis]}
        experiments={runningExperiments}
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={runningExperimentActivities}
        events={runningEvents}
      />
    ),
  },
  {
    id: "almanac-tui-view/suspicious",
    title: "Almanac TUI View",
    name: "suspicious",
    render: () => (
      <StoryAlmanacTuiView
        statusLine="session_0001 | active | experiments 3/5"
        objective={activeObjective}
        session={runningSession}
        experimentCount={suspiciousExperiments.length}
        activeExperiment={undefined}
        hypotheses={[activeHypothesis]}
        experiments={suspiciousExperiments}
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={suspiciousExperimentActivities}
        events={suspiciousEvents}
      />
    ),
  },
  {
    id: "almanac-tui-view/completed",
    title: "Almanac TUI View",
    name: "completed",
    render: () => (
      <StoryAlmanacTuiView
        statusLine="session_0001 | closed | experiments 2/5"
        objective={activeObjective}
        session={completedSession}
        experimentCount={completedExperiments.length}
        activeExperiment={undefined}
        hypotheses={[activeHypothesis]}
        experiments={completedExperiments}
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={runningExperimentActivities}
        events={completedEvents}
      />
    ),
  },
  {
    id: "almanac-tui-view/failed",
    title: "Almanac TUI View",
    name: "failed",
    render: () => (
      <StoryAlmanacTuiView
        statusLine="Session session_0001 failed"
        objective={activeObjective}
        session={runningSession}
        experimentCount={suspiciousExperiments.length}
        activeExperiment={suspiciousExperiment}
        hypotheses={[activeHypothesis]}
        experiments={[acceptedExperiment, suspiciousExperiment]}
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={suspiciousExperimentActivities}
        events={suspiciousEvents}
      />
    ),
  },
] satisfies TuiStory[];

type StoryAlmanacTuiViewProps = {
  statusLine: string;
  objective: ObjectiveRecord | undefined;
  session: SessionRecord | undefined;
  experimentCount: number;
  activeExperiment: ExperimentRecord | undefined;
  hypotheses: HypothesisRecord[];
  experiments: ExperimentRecord[];
  hypothesisActivities: HypothesisActivityRecord[];
  experimentActivities: ExperimentActivityRecord[];
  events: EventRecord[];
};

function StoryAlmanacTuiView({
  statusLine,
  objective,
  session,
  experimentCount,
  activeExperiment,
  hypotheses,
  experiments,
  hypothesisActivities,
  experimentActivities,
  events,
}: StoryAlmanacTuiViewProps) {
  const { exit } = useApp();
  const [message, setMessage] = useState<DashboardControlMessage | undefined>(
    undefined,
  );

  return (
    <AlmanacTuiView
      workspace={storyWorkspace}
      statusLine={statusLine}
      dashboardMessage={message}
      objective={objective}
      session={session}
      experimentCount={experimentCount}
      maxExperiments={maxExperimentCount}
      activeExperiment={activeExperiment}
      hypotheses={hypotheses}
      experiments={experiments}
      hypothesisActivities={hypothesisActivities}
      experimentActivities={experimentActivities}
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
