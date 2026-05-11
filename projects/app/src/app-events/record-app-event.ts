import { appEvents } from "../data/db/schema";
import { runSyncedWrite } from "../data/db/sync";
import { dateTimeModule } from "../modules/date-time";

export async function recordAppEvent({
  type,
  message,
  payload = {},
}: {
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.insert(appEvents)
        .values({
          type,
          message,
          payloadJson: JSON.stringify(payload),
          syncVersion,
          syncDeleted: false,
          createdAt: dateTimeModule.nowIso(),
        })
        .run();
    },
  });
}
