import { FeedView, type FeedEntryRecord as UiFeedEntryRecord } from "@situ/web-app-ui";
import type { FeedEntryRecord } from "@situ/protocol";
import { useFeedEntries } from "../../hooks/feed-entries";
import { useActiveResearchProject } from "../../hooks/research-projects";

export function FeedPage() {
  const { project, isKickedOff } = useActiveResearchProject();
  const entries = useFeedEntries();
  const projectEntries = project
    ? entries.filter((entry) => entry.researchProjectId === project.id)
    : [];
  return (
    <FeedView
      entries={projectEntries.map((entry) => adaptEntry({ entry }))}
      projectKickedOff={isKickedOff}
    />
  );
}

function adaptEntry({ entry }: { entry: FeedEntryRecord }): UiFeedEntryRecord {
  return {
    id: entry.id,
    projectId: entry.researchProjectId,
    summaryMarkdown: entry.summaryMarkdown,
    severity: entry.severity,
    citedAppEventIds: entry.citedAppEventIds,
    windowStartedAt: entry.windowStartedAt,
    windowEndedAt: entry.windowEndedAt,
    createdAt: entry.createdAt,
  };
}
