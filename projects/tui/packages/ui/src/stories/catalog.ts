import lodash from "lodash";
import { stories as situTuiViewStories } from "../components/situ-tui-view/situ-tui-view.stories.js";
import { stories as bucketBarsStories } from "../components/bucket-bars/bucket-bars.stories.js";
import { stories as choicePromptStories } from "../components/choice-prompt/choice-prompt.stories.js";
import { stories as commandInputStories } from "../components/command-input/command-input.stories.js";
import { stories as contrastiveFeatureDiffStories } from "../components/contrastive-feature-diff/contrastive-feature-diff.stories.js";
import { stories as contributionBarsStories } from "../components/contribution-bars/contribution-bars.stories.js";
import { stories as dashboardControlsStories } from "../components/dashboard-controls/dashboard-controls.stories.js";
import { stories as fullscreenDashboardStories } from "../components/fullscreen-dashboard/fullscreen-dashboard.stories.js";
import { stories as heatmapGridStories } from "../components/heatmap-grid/heatmap-grid.stories.js";
import { stories as layoutBoxStories } from "../components/layout-box/layout-box.stories.js";
import { stories as loadingViewStories } from "../components/loading-view/loading-view.stories.js";
import { stories as metricTrendStories } from "../components/metric-trend/metric-trend.stories.js";
import { stories as onboardingPromptStories } from "../components/onboarding-prompt/onboarding-prompt.stories.js";
import { stories as paneSectionStories } from "../components/pane-section/pane-section.stories.js";
import { stories as steeringDoseResponseStories } from "../components/steering-dose-response/steering-dose-response.stories.js";
import { stories as tokenFeatureMatrixStories } from "../components/token-feature-matrix/token-feature-matrix.stories.js";
import type { TuiStory } from "./story-types.js";

export const allStories: TuiStory[] = [
  ...situTuiViewStories,
  ...bucketBarsStories,
  ...choicePromptStories,
  ...commandInputStories,
  ...dashboardControlsStories,
  ...fullscreenDashboardStories,
  ...contrastiveFeatureDiffStories,
  ...contributionBarsStories,
  ...heatmapGridStories,
  ...layoutBoxStories,
  ...loadingViewStories,
  ...metricTrendStories,
  ...steeringDoseResponseStories,
  ...tokenFeatureMatrixStories,
  ...paneSectionStories,
  ...onboardingPromptStories,
];

export function findStory({ id }: { id: string }): TuiStory | undefined {
  return lodash.find(allStories, (story) => story.id === id);
}

export function storyListText(): string {
  return allStories.map((story) => story.id).join("\n");
}
