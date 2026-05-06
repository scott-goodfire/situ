import { StartSessionPrompt } from "./start-session-prompt.js";
import {
  maxExperimentCount,
  storyWorkspace,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "start-session-prompt/ready",
    title: "Start Session Prompt",
    name: "ready",
    render: () => <StartSessionPromptStory />,
  },
] satisfies TuiStory[];

function StartSessionPromptStory() {
  return (
    <StartSessionPrompt
      workspace={storyWorkspace}
      params={{
        objective: "Explore small, trustworthy improvements.",
        research_context: "Run the project-native eval and preserve plaintext evidence.",
        max_experiments: maxExperimentCount,
      }}
      isActive={false}
      onStart={() => {}}
      onExit={() => {}}
      terminalSize={{ columns: 112, rows: 34 }}
    />
  );
}
