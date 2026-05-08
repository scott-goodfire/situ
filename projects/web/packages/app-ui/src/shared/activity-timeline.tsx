import { DxSection, DxTime, muted } from "@situ/web-ui";
import type { ReactNode } from "react";
import { MarkdownText } from "./markdown-text";
import * as s from "../styles.css";

export type ActivityTimelineItem = {
  id: string;
  actor: ReactNode;
  body: ReactNode;
  kind: ReactNode;
  createdAt: string;
};

export function ActivityTimeline({
  title,
  activities,
  emptyLabel,
}: {
  title: string;
  activities: ActivityTimelineItem[];
  emptyLabel: ReactNode;
}) {
  const sortedActivities = [...activities].sort(
    (a, b) => timestampMillis({ isoTimestamp: b.createdAt }) - timestampMillis({ isoTimestamp: a.createdAt }),
  );

  return (
    <DxSection title={title}>
      {sortedActivities.length === 0 && <p className={muted}>{emptyLabel}</p>}

      {sortedActivities.length > 0 && (
        <ol className={s.activityList}>
          {sortedActivities.map((activity) => (
            <li className={s.activityItem} key={activity.id}>
              <div className={s.activityItemMeta}>
                <span>{activity.actor}</span>
                <span>{activity.kind}</span>
                <DxTime iso={activity.createdAt} />
              </div>
              <MarkdownText value={activity.body} className={s.activityItemBody} />
            </li>
          ))}
        </ol>
      )}
    </DxSection>
  );
}

function timestampMillis({ isoTimestamp }: { isoTimestamp: string }): number {
  const value = Date.parse(isoTimestamp);
  return Number.isNaN(value) ? 0 : value;
}
