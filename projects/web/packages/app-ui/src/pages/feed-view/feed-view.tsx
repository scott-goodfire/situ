import { DxBadge, DxSection, DxTime, mono } from "@situ/web-ui";
import type { FeedEntryRecord } from "../../domain/records";
import { feedEntrySeverityLabel, feedEntrySeverityTone } from "./severity-tone";
import * as s from "./feed-view.css";

export function FeedView({
  entries,
  projectKickedOff,
}: {
  entries: FeedEntryRecord[];
  projectKickedOff: boolean;
}) {
  if (!projectKickedOff) {
    return (
      <DxSection title="Feed">
        <p className={s.emptyState}>
          No active project yet. Start one from the Project page — the feed will populate as the
          session progresses.
        </p>
      </DxSection>
    );
  }
  if (entries.length === 0) {
    return (
      <DxSection title="Feed">
        <p className={s.emptyState}>Waiting for the first narration from the scribe.</p>
      </DxSection>
    );
  }
  const sorted = [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return (
    <DxSection title="Feed">
      <ol className={s.list}>
        {sorted.map((entry) => (
          <li key={entry.id} className={s.item}>
            <header className={s.header}>
              <DxBadge tone={feedEntrySeverityTone({ severity: entry.severity })}>
                {feedEntrySeverityLabel({ severity: entry.severity })}
              </DxBadge>
              <DxTime iso={entry.createdAt} className={mono} />
            </header>
            <p className={s.body}>{entry.summaryMarkdown}</p>
            {entry.citedAppEventIds.length > 0 ? (
              <p className={s.citations}>
                Cited: <span className={mono}>{entry.citedAppEventIds.join(", ")}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </DxSection>
  );
}
