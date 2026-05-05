import lodash from "lodash";
import { stories as almanacTuiViewStories } from "../components/almanac-tui-view/almanac-tui-view.stories.js";
import { stories as appFrameStories } from "../components/app-frame/app-frame.stories.js";
import { stories as choicePromptStories } from "../components/choice-prompt/choice-prompt.stories.js";
import { stories as commandInputStories } from "../components/command-input/command-input.stories.js";
import { stories as experimentsSectionStories } from "../components/experiments-section/experiments-section.stories.js";
import { stories as nowSectionStories } from "../components/now-section/now-section.stories.js";
import { stories as runSectionStories } from "../components/run-section/run-section.stories.js";
import { stories as sectionStories } from "../components/section/section.stories.js";
import { stories as timelineSectionStories } from "../components/timeline-section/timeline-section.stories.js";
import type { TuiStory } from "./story-types.js";

export const allStories: TuiStory[] = [
  ...almanacTuiViewStories,
  ...appFrameStories,
  ...choicePromptStories,
  ...commandInputStories,
  ...runSectionStories,
  ...nowSectionStories,
  ...experimentsSectionStories,
  ...timelineSectionStories,
  ...sectionStories,
];

export function findStory({ id }: { id: string }): TuiStory | undefined {
  return lodash.find(allStories, (story) => story.id === id);
}

export function storyListText(): string {
  return allStories.map((story) => story.id).join("\n");
}
