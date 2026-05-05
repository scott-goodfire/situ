import { Box, render, Text } from "ink";
import { allStories, findStory, storyListText } from "./catalog.js";
import type { TuiStory } from "./story-types.js";

const DEFAULT_STORY_ID = "almanac-tui-view/running";

function main() {
  const storyId = requestedStoryId({ args: process.argv.slice(2) });

  if (storyId === "list") {
    console.log(storyListText());
    return;
  }

  const story = findStory({ id: storyId });
  if (!story) {
    console.error(`Unknown TUI story: ${storyId}`);
    console.error("");
    console.error("Available stories:");
    console.error(storyListText());
    process.exitCode = 1;
    return;
  }

  render(<StoryPreview story={story} />);
}

function StoryPreview({ story }: { story: TuiStory }) {
  return (
    <Box flexDirection="column">
      <Text dimColor>{story.id}</Text>
      {story.render()}
    </Box>
  );
}

function requestedStoryId({ args }: { args: string[] }): string {
  const firstArg = args[0];

  if (!firstArg) {
    return DEFAULT_STORY_ID;
  }

  return firstArg;
}

main();
