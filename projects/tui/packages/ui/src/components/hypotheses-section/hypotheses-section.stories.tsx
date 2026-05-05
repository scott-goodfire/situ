import { HypothesesSection } from "./hypotheses-section.js";
import { activeHypothesis } from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "hypotheses-section/empty",
    title: "Hypotheses Section",
    name: "empty",
    render: () => <HypothesesSection hypotheses={[]} />,
  },
  {
    id: "hypotheses-section/active",
    title: "Hypotheses Section",
    name: "active",
    render: () => <HypothesesSection hypotheses={[activeHypothesis]} />,
  },
] satisfies TuiStory[];
