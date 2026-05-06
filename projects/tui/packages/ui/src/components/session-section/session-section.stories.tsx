import { SessionSection } from "./session-section.js";
import {
  activeProject,
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
        project={activeProject}
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
        project={activeProject}
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
        project={activeProject}
        session={completedSession}
        experimentCount={5}
        maxExperiments={maxExperimentCount}
      />
    ),
  },
] satisfies TuiStory[];
