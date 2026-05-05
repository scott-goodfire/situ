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
import type { CommandMessage } from "../command-input/command-input.js";
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
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<CommandMessage>({
    tone: "gray",
    text: "Type /help for commands.",
  });

  return (
    <AlmanacTuiView
      workspace={storyWorkspace}
      statusLine={statusLine}
      commandDraft={draft}
      commandMessage={message}
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
      onCommandChange={({ value }) => {
        setDraft(value);
      }}
      onCommandSubmit={({ value }) => {
        handleStoryCommandSubmit({
          value,
          statusLine,
          exit,
          setDraft,
          setMessage,
        });
      }}
    />
  );
}

function handleStoryCommandSubmit({
  value,
  statusLine,
  exit,
  setDraft,
  setMessage,
}: {
  value: string;
  statusLine: string;
  exit: () => void;
  setDraft: (value: string) => void;
  setMessage: (value: CommandMessage) => void;
}) {
  const command = value.trim();
  setDraft("");

  if (!command) {
    return;
  }

  if (command === "/quit" || command === "q") {
    exit();
    return;
  }

  if (command === "/help") {
    setMessage({
      tone: "gray",
      text: "Commands: /status, /help, /quit",
    });
    return;
  }

  if (command === "/status") {
    setMessage({
      tone: "cyan",
      text: statusLine,
    });
    return;
  }

  setMessage({
    tone: "yellow",
    text: `Unknown command: ${command}. Try /help.`,
  });
}
