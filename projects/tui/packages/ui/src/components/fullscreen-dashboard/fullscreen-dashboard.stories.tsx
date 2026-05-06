import { useState } from "react";
import { useApp } from "ink";
import { FullscreenDashboard } from "./fullscreen-dashboard.js";
import type {
  DashboardCommand,
  DashboardControlMessage,
} from "../dashboard-controls/dashboard-controls.js";
import {
  activeHypothesis,
  activeProject,
  maxExperimentCount,
  runningAgents,
  runningEvaluationActivities,
  runningEvaluations,
  runningExperimentActivities,
  runningExperiments,
  runningHypothesisActivities,
  runningSession,
  runningTaskActivities,
  runningTasks,
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
    id: "fullscreen-dashboard/commands",
    title: "Fullscreen Dashboard",
    name: "commands",
    render: () => (
      <StoryFullscreenDashboard
        initialControlMode="commands"
        terminalSize={{ columns: 112, rows: 34 }}
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
  initialControlMode = "idle",
  terminalSize,
}: {
  initialControlMode?: "idle" | "commands";
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
      project={activeProject}
      session={runningSession}
      agents={runningAgents}
      tasks={runningTasks}
      experimentCount={runningExperiments.length}
      maxExperiments={maxExperimentCount}
      hypotheses={[activeHypothesis]}
      experiments={runningExperiments}
      evaluations={runningEvaluations}
      taskActivities={runningTaskActivities}
      hypothesisActivities={runningHypothesisActivities}
      experimentActivities={runningExperimentActivities}
      evaluationActivities={runningEvaluationActivities}
      events={[]}
      initialControlMode={initialControlMode}
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
