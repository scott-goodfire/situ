import { ReconnectSessionPrompt } from "./reconnect-session-prompt.js";
import {
  activeProject,
  maxExperimentCount,
  runningExperiments,
  runningSession,
  storyWorkspace,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "reconnect-session-prompt/active-session",
    title: "Reconnect Session Prompt",
    name: "active-session",
    render: () => <ReconnectSessionPromptStory />,
  },
] satisfies TuiStory[];

function ReconnectSessionPromptStory() {
  return (
    <ReconnectSessionPrompt
      workspace={storyWorkspace}
      session={runningSession}
      project={activeProject}
      experimentCount={runningExperiments.length}
      maxExperiments={maxExperimentCount}
      onReconnect={() => {}}
      onQuit={() => {}}
    />
  );
}
