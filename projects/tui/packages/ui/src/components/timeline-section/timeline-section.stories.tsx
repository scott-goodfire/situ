import { TimelineSection } from "./timeline-section.js";
import { runningEvents, suspiciousEvents } from "../../fixtures/story-data.js";
import type { TuiStory } from "../../stories/story-types.js";

export const stories = [
  {
    id: "timeline-section/empty",
    title: "Timeline Section",
    name: "empty",
    render: () => <TimelineSection events={[]} />,
  },
  {
    id: "timeline-section/running",
    title: "Timeline Section",
    name: "running",
    render: () => <TimelineSection events={runningEvents} />,
  },
  {
    id: "timeline-section/with-warning",
    title: "Timeline Section",
    name: "with-warning",
    render: () => <TimelineSection events={suspiciousEvents} />,
  },
] satisfies TuiStory[];
