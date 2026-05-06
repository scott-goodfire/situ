import { DxSection, muted } from "@situ/web-ui";
import { DateTime } from "luxon";
import orderBy from "lodash/orderBy";
import * as s from "../../../styles.css";
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
      {sortedActivities.length === 0 && <p className={muted}>{emptyLabel}</p>}

      {sortedActivities.length > 0 && (
        <ol className={s.activityList}>
          {sortedActivities.map((activity) => (
            <li className={s.activityItem} key={activity.id}>
              <div className={s.activityItemMeta}>
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
