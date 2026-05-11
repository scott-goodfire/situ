import { payloadRecord } from "./payload-record";
import type { ActivityRowBase } from "./types";

export function activityRecordBase({
  row,
  collection,
}: {
  row: ActivityRowBase;
  collection: string;
}) {
  return {
    id: row.id,
    actorAgentId: row.actorAgentId,
    actor: row.actor,
    kind: row.kind,
    body: row.body,
    payload: payloadRecord({ payloadJson: row.payloadJson, label: `${collection}/${row.id}` }),
    createdAt: row.createdAt,
  };
}
