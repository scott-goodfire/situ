import lodash from "lodash";
import { stories as activitySectionStories } from "../components/activity-section/activity-section.stories.js";
import { stories as almanacTuiViewStories } from "../components/almanac-tui-view/almanac-tui-view.stories.js";
import { stories as appFrameStories } from "../components/app-frame/app-frame.stories.js";
import { stories as bucketBarsStories } from "../components/bucket-bars/bucket-bars.stories.js";
import { stories as choicePromptStories } from "../components/choice-prompt/choice-prompt.stories.js";
import { stories as commandInputStories } from "../components/command-input/command-input.stories.js";
import { stories as experimentsSectionStories } from "../components/experiments-section/experiments-section.stories.js";
import { stories as hypothesesSectionStories } from "../components/hypotheses-section/hypotheses-section.stories.js";
import { stories as metricTrendStories } from "../components/metric-trend/metric-trend.stories.js";
import { stories as nowSectionStories } from "../components/now-section/now-section.stories.js";
import { stories as sectionStories } from "../components/section/section.stories.js";
import { stories as sessionSectionStories } from "../components/session-section/session-section.stories.js";
import { stories as timelineSectionStories } from "../components/timeline-section/timeline-section.stories.js";
import type { TuiStory } from "./story-types.js";

export const allStories: TuiStory[] = [
  ...almanacTuiViewStories,
  ...appFrameStories,
  ...bucketBarsStories,
  ...choicePromptStories,
  ...commandInputStories,
  ...metricTrendStories,
  ...sessionSectionStories,
  ...nowSectionStories,
  ...hypothesesSectionStories,
  ...experimentsSectionStories,
  ...activitySectionStories,
  ...timelineSectionStories,
  ...sectionStories,
];

export function findStory({ id }: { id: string }): TuiStory | undefined {
  return lodash.find(allStories, (story) => story.id === id);
}

export function storyListText(): string {
  return allStories.map((story) => story.id).join("\n");
}
