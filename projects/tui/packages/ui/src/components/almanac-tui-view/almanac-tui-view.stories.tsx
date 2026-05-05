import { useState } from "react";
import { useApp } from "ink";
import type { EventRecord, ExperimentRecord, RunRecord } from "@almanac/protocol";
import { AlmanacTuiView } from "./almanac-tui-view.js";
import type { CommandMessage } from "../command-input/command-input.js";
import {
  completedEvents,
  completedExperiments,
  completedRun,
  failedRun,
  maxExperimentCount,
  runningEvents,
  runningExperiment,
  runningExperiments,
  runningRun,
  storyWorkspace,
  suspiciousEvents,
  suspiciousExperiments,
  suspiciousExperiment,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "almanac-tui-view/no-run",
    title: "Almanac TUI View",
    name: "no-run",
    render: () => (
      <StoryAlmanacTuiView
        statusLine="Connecting to local session..."
        run={undefined}
        experimentCount={0}
        activeExperiment={undefined}
        experiments={[]}
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
        statusLine="run_0001 | running | experiments 3/5"
        run={runningRun}
        experimentCount={runningExperiments.length}
        activeExperiment={runningExperiment}
        experiments={runningExperiments}
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
        statusLine="run_0001 | running | experiments 3/5"
        run={runningRun}
        experimentCount={suspiciousExperiments.length}
        activeExperiment={undefined}
        experiments={suspiciousExperiments}
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
        statusLine="run_0001 | completed | experiments 2/5"
        run={completedRun}
        experimentCount={completedExperiments.length}
        activeExperiment={undefined}
        experiments={completedExperiments}
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
        statusLine="Run run_0001 failed"
        run={failedRun}
        experimentCount={suspiciousExperiments.length}
        activeExperiment={suspiciousExperiment}
        experiments={suspiciousExperiments}
        events={suspiciousEvents}
      />
    ),
  },
] satisfies TuiStory[];

type StoryAlmanacTuiViewProps = {
  statusLine: string;
  run: RunRecord | undefined;
  experimentCount: number;
  activeExperiment: ExperimentRecord | undefined;
  experiments: ExperimentRecord[];
  events: EventRecord[];
};

function StoryAlmanacTuiView({
  statusLine,
  run,
  experimentCount,
  activeExperiment,
  experiments,
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
      run={run}
      experimentCount={experimentCount}
      maxExperiments={maxExperimentCount}
      activeExperiment={activeExperiment}
      experiments={experiments}
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
