import { EvaluationsSection } from "./evaluations-section.js";
import {
  runningEvaluationActivities,
  runningEvaluations,
  suspiciousEvaluationActivities,
  suspiciousEvaluations,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "evaluations-section/empty",
    title: "Evaluations Section",
    name: "empty",
    render: () => <EvaluationsSection evaluations={[]} evaluationActivities={[]} />,
  },
  {
    id: "evaluations-section/running",
    title: "Evaluations Section",
    name: "running",
    render: () => (
      <EvaluationsSection
        evaluations={runningEvaluations}
        evaluationActivities={runningEvaluationActivities}
      />
    ),
  },
  {
    id: "evaluations-section/suspicious",
    title: "Evaluations Section",
    name: "suspicious",
    render: () => (
      <EvaluationsSection
        evaluations={suspiciousEvaluations}
        evaluationActivities={suspiciousEvaluationActivities}
      />
    ),
  },
] satisfies TuiStory[];
