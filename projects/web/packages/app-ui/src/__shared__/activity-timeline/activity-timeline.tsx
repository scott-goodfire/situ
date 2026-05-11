import type { ActivityRecord } from "@situ/protocol";
import { DxSection, DxTime, muted } from "@situ/web-ui";
import type { ReactNode } from "react";
import * as s from "../../styles.css";

export function ActivityTimeline({
  title,
  activities,
  emptyLabel,
}: {
  title: string;
  activities: ActivityRecord[];
  emptyLabel: ReactNode;
}) {
  const sorted = [...activities].sort(
    (a, b) => millis({ iso: b.createdAt }) - millis({ iso: a.createdAt }),
  );

  return (
    <DxSection title={title}>
      {sorted.length === 0 && <p className={muted}>{emptyLabel}</p>}
      {sorted.length > 0 && (
        <ol className={s.activityList}>
          {sorted.map((activity) => (
            <li className={s.activityItem} key={activity.id}>
              <div className={s.activityItemMeta}>
                <span className={s.activityItemActor}>{activity.actor}</span>
                <span className={s.activityItemKind}>{activity.kind}</span>
                <DxTime iso={activity.createdAt} />
              </div>
              <p className={s.activityItemBody}>{activity.body}</p>
            </li>
          ))}
        </ol>
      )}
    </DxSection>
  );
}

function millis({ iso }: { iso: string }): number {
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
}
