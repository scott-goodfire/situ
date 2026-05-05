import { NowSection } from "./now-section.js";
import {
  completedRun,
  runningExperiment,
  runningRun,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "now-section/waiting",
    title: "Now Section",
    name: "waiting",
    render: () => <NowSection activeExperiment={undefined} latestRun={runningRun} />,
  },
  {
    id: "now-section/running-experiment",
    title: "Now Section",
    name: "running-experiment",
    render: () => (
      <NowSection activeExperiment={runningExperiment} latestRun={runningRun} />
    ),
  },
  {
    id: "now-section/completed-run",
    title: "Now Section",
    name: "completed-run",
    render: () => <NowSection activeExperiment={undefined} latestRun={completedRun} />,
  },
] satisfies TuiStory[];
