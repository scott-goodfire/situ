import { SessionSection } from "./session-section.js";
import {
  activeObjective,
  completedSession,
  maxExperimentCount,
  runningSession,
} from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "session-section/no-session",
    title: "Session Section",
    name: "no-session",
    render: () => (
      <SessionSection
        objective={activeObjective}
        session={undefined}
        experimentCount={0}
        maxExperiments={maxExperimentCount}
      />
    ),
  },
  {
    id: "session-section/running",
    title: "Session Section",
    name: "running",
    render: () => (
      <SessionSection
        objective={activeObjective}
        session={runningSession}
        experimentCount={3}
        maxExperiments={maxExperimentCount}
      />
    ),
  },
  {
    id: "session-section/completed",
    title: "Session Section",
    name: "completed",
    render: () => (
      <SessionSection
        objective={activeObjective}
        session={completedSession}
        experimentCount={5}
        maxExperiments={maxExperimentCount}
      />
    ),
  },
] satisfies TuiStory[];
