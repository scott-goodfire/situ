import { ActivitySection } from "./activity-section.js";
import {
  runningEvaluationActivities,
  runningExperimentActivities,
  runningHypothesisActivities,
  suspiciousEvaluationActivities,
  suspiciousExperimentActivities,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "activity-section/empty",
    title: "Activity Section",
    name: "empty",
    render: () => (
      <ActivitySection
        hypothesisActivities={[]}
        experimentActivities={[]}
        evaluationActivities={[]}
      />
    ),
  },
  {
    id: "activity-section/running",
    title: "Activity Section",
    name: "running",
    render: () => (
      <ActivitySection
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={runningExperimentActivities}
        evaluationActivities={runningEvaluationActivities}
      />
    ),
  },
  {
    id: "activity-section/concern",
    title: "Activity Section",
    name: "concern",
    render: () => (
      <ActivitySection
        hypothesisActivities={runningHypothesisActivities}
        experimentActivities={suspiciousExperimentActivities}
        evaluationActivities={suspiciousEvaluationActivities}
      />
    ),
  },
] satisfies TuiStory[];
