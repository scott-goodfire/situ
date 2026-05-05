import { DxSection } from "@situ/web-ui";
import { DateTime } from "luxon";
import orderBy from "lodash/orderBy";
import type { ActivityItem } from "../types";

export function ActivityTimeline({
  title,
  activities,
  emptyLabel,
}: {
  title: string;
  activities: ActivityItem[];
  emptyLabel: string;
}) {
  const sortedActivities = orderBy(
    activities,
    [(activity) => timestampMillis({ isoTimestamp: activity.createdAt })],
    ["desc"],
  );

  return (
    <DxSection title={title}>
      {sortedActivities.length === 0 && <p className="dx-muted">{emptyLabel}</p>}

      {sortedActivities.length > 0 && (
        <ol className="situ-activity-list">
          {sortedActivities.map((activity) => (
            <li className="situ-activity-item" key={activity.id}>
              <div className="situ-activity-item__meta">
                <span>{activity.actor}</span>
                <span>{activity.kind}</span>
                <span>{formatTime({ value: activity.createdAt })}</span>
              </div>
              <p>{activity.body}</p>
            </li>
          ))}
        </ol>
      )}
    </DxSection>
  );
}

function timestampMillis({ isoTimestamp }: { isoTimestamp: string }): number {
  return DateTime.fromISO(isoTimestamp).toMillis();
}

function formatTime({ value }: { value: string }): string {
  return DateTime.fromISO(value).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}
