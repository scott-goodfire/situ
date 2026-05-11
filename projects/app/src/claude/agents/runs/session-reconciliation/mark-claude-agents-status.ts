import { eq } from "drizzle-orm";

import { getDb } from "../../../../data/db/client";
import { claudeAgents, session as sessionTable } from "../../../../data/db/schema";
import { runSyncedWrite } from "../../../../data/db/sync";
import { dateTimeModule } from "../../../../modules/date-time";

enum ClaudeAgentRuntimeStatus {
  Active = "active",
  Idle = "idle",
}

export async function markClaudeAgentsActive(): Promise<void> {
  await markClaudeAgentsStatus({
    fromStatus: ClaudeAgentRuntimeStatus.Idle,
    toStatus: ClaudeAgentRuntimeStatus.Active,
    touchActiveSession: false,
  });
}

export async function markClaudeAgentsIdle(): Promise<void> {
  await markClaudeAgentsStatus({
    fromStatus: ClaudeAgentRuntimeStatus.Active,
    toStatus: ClaudeAgentRuntimeStatus.Idle,
    touchActiveSession: true,
  });
}

async function markClaudeAgentsStatus({
  fromStatus,
  toStatus,
  touchActiveSession,
}: {
  fromStatus: ClaudeAgentRuntimeStatus;
  toStatus: ClaudeAgentRuntimeStatus;
  touchActiveSession: boolean;
}): Promise<void> {
  const candidate = await getDb().query.claudeAgents.findFirst({
    where: eq(claudeAgents.status, fromStatus),
  });
  if (!candidate) {
    return;
  }

  const updatedAt = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.update(claudeAgents)
        .set({ status: toStatus, syncVersion, updatedAt })
        .where(eq(claudeAgents.status, fromStatus))
        .run();

      if (touchActiveSession) {
        db.update(sessionTable)
          .set({ syncVersion, updatedAt })
          .where(eq(sessionTable.status, "active"))
          .run();
      }
    },
  });
}
