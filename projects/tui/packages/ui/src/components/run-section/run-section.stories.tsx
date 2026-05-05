import { RunSection } from "./run-section.js";
import {
  completedRun,
  maxExperimentCount,
  runningRun,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "run-section/no-run",
    title: "Run Section",
    name: "no-run",
    render: () => (
      <RunSection
        run={undefined}
        experimentCount={0}
        maxExperiments={maxExperimentCount}
      />
    ),
  },
  {
    id: "run-section/running",
    title: "Run Section",
    name: "running",
    render: () => (
      <RunSection
        run={runningRun}
        experimentCount={3}
        maxExperiments={maxExperimentCount}
      />
    ),
  },
  {
    id: "run-section/completed",
    title: "Run Section",
    name: "completed",
    render: () => (
      <RunSection
        run={completedRun}
        experimentCount={5}
        maxExperiments={maxExperimentCount}
      />
    ),
  },
] satisfies TuiStory[];
