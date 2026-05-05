import { Text } from "ink";
import { AppFrame } from "./app-frame.js";
import { PaneSection } from "../pane-section/pane-section.js";
import { storyWorkspace } from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "app-frame/default",
    title: "App Frame",
    name: "default",
    render: () => (
      <AppFrame
        workspace={storyWorkspace}
        statusLine="run_0001 | running | experiments 3/5"
        footer={<Text dimColor>Type /help for commands.</Text>}
      >
        <PaneSection title="Now">
          <Text>exp_run_0001_retrieval_filter | Try retrieval filtering.</Text>
        </PaneSection>
      </AppFrame>
    ),
  },
] satisfies TuiStory[];
