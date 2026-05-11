import { and, eq, inArray } from "drizzle-orm";

import { claudeAgentRuns } from "../../../../data/db/schema";
import { runSyncedWrite } from "../../../../data/db/sync";
import { dateTimeModule } from "../../../../modules/date-time";

export async function failRunningRunsForSession({
  claudeSessionId,
  message,
}: {
  claudeSessionId: string;
  message: string;
}): Promise<void> {
  const updatedAt = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(claudeAgentRuns)
        .set({
          status: "failed",
          errorMessage: message,
          syncVersion,
          updatedAt,
        })
        .where(
          and(
            eq(claudeAgentRuns.claudeSessionId, claudeSessionId),
            inArray(claudeAgentRuns.status, ["queued", "running", "waiting_for_action"]),
          ),
        )
        .run();
    },
  });
}
