import { useState } from "react";
import { useApp } from "ink";
import { FullscreenDashboard } from "./fullscreen-dashboard.js";
import type {
  DashboardCommand,
  DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import {
  activeHypothesis,
  activeObjective,
  activeResearchContext,
  maxExperimentCount,
  runningEvaluationActivities,
  runningEvaluations,
  runningExperimentActivities,
  runningExperiments,
  runningHypothesisActivities,
  runningSession,
  storyWorkspace,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "fullscreen-dashboard/running",
    title: "Fullscreen Dashboard",
    name: "running",
    render: () => (
      <StoryFullscreenDashboard
        terminalSize={{ columns: 112, rows: 34 }}
      />
    ),
  },
  {
    id: "fullscreen-dashboard/narrow",
    title: "Fullscreen Dashboard",
    name: "narrow",
    render: () => (
      <StoryFullscreenDashboard
        terminalSize={{ columns: 88, rows: 26 }}
      />
    ),
  },
  {
    id: "fullscreen-dashboard/too-small",
    title: "Fullscreen Dashboard",
    name: "too small",
    render: () => (
      <StoryFullscreenDashboard
        terminalSize={{ columns: 72, rows: 18 }}
      />
    ),
  },
] satisfies TuiStory[];

function StoryFullscreenDashboard({
  terminalSize,
}: {
  terminalSize: { columns: number; rows: number };
}) {
  const { exit } = useApp();
  const [message, setMessage] = useState<DashboardControlMessage | undefined>(
    undefined,
  );
  const statusLine = "session_0001 | active | experiments 3/5";

  return (
    <FullscreenDashboard
      workspace={storyWorkspace}
      statusLine={statusLine}
      dashboardMessage={message}
      objective={activeObjective}
      researchContext={activeResearchContext}
      session={runningSession}
      experimentCount={runningExperiments.length}
      maxExperiments={maxExperimentCount}
      hypotheses={[activeHypothesis]}
      experiments={runningExperiments}
      evaluations={runningEvaluations}
      hypothesisActivities={runningHypothesisActivities}
      experimentActivities={runningExperimentActivities}
      evaluationActivities={runningEvaluationActivities}
      terminalSize={terminalSize}
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
