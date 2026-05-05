import { NowSection } from "./now-section.js";
import {
  completedSession,
  runningExperiment,
  runningSession,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "now-section/waiting",
    title: "Now Section",
    name: "waiting",
    render: () => <NowSection activeExperiment={undefined} latestSession={runningSession} />,
  },
  {
    id: "now-section/running-experiment",
    title: "Now Section",
    name: "running-experiment",
    render: () => (
      <NowSection activeExperiment={runningExperiment} latestSession={runningSession} />
    ),
  },
  {
    id: "now-section/completed-session",
    title: "Now Section",
    name: "completed-session",
    render: () => (
      <NowSection activeExperiment={undefined} latestSession={completedSession} />
    ),
  },
] satisfies TuiStory[];
