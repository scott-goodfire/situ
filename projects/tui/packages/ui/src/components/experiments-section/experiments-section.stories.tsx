import { ExperimentsSection } from "./experiments-section.js";
import {
  runningExperiments,
  suspiciousExperiments,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "experiments-section/empty",
    title: "Experiments Section",
    name: "empty",
    render: () => <ExperimentsSection experiments={[]} />,
  },
  {
    id: "experiments-section/running",
    title: "Experiments Section",
    name: "running",
    render: () => <ExperimentsSection experiments={runningExperiments} />,
  },
  {
    id: "experiments-section/suspicious",
    title: "Experiments Section",
    name: "suspicious",
    render: () => <ExperimentsSection experiments={suspiciousExperiments} />,
  },
] satisfies TuiStory[];
