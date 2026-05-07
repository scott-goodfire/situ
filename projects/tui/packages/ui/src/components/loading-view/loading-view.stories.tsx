import { LoadingView } from "./loading-view.js";
import { storyWorkspace } from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "loading-view/startup",
    title: "Loading View",
    name: "startup",
    render: () => (
      <LoadingView
        workspace={storyWorkspace}
        title="Loading..."
        detail="Connecting to the local Situ app and loading workspace state."
        onExit={() => {}}
        terminalSize={{ columns: 112, rows: 34 }}
      />
    ),
  },
] satisfies TuiStory[];
