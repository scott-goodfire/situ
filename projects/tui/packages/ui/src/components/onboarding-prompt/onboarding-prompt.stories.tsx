import { OnboardingPrompt } from "./onboarding-prompt.js";
import {
  maxExperimentCount,
  storyWorkspace,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "onboarding-prompt/objective",
    title: "Onboarding Prompt",
    name: "objective",
    render: () => (
      <OnboardingPrompt
        workspace={storyWorkspace}
        defaults={{
          objective: "Explore small, trustworthy improvements.",
          researchContext:
            "Use project-native tools, tests, evals, logs, and artifacts.",
          max_experiments: maxExperimentCount,
        }}
        isActive={false}
        onSubmit={() => {}}
        onExit={() => {}}
        terminalSize={{ columns: 112, rows: 34 }}
      />
    ),
  },
] satisfies TuiStory[];
