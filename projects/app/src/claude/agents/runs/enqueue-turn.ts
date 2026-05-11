import { claudeAgentRuns } from "../../../data/db/schema";
import { runSyncedWrite } from "../../../data/db/sync";
import { dateTimeModule } from "../../../modules/date-time";
import { enqueueWorkItem } from "../../../runtime/work-items/enqueue-work-item";

export async function enqueueClaudeAgentWork({
  purpose,
  content,
  targetKind = "claude_agent_run",
  targetId,
  payload = {},
}: {
  purpose: string;
  content: string;
  targetKind?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}): Promise<{
  workItemId: string;
  claudeAgentRunId: string;
}> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Claude work content is required.");
  }

  const claudeAgentRunId = crypto.randomUUID();
  const resolvedTargetId = targetId ?? claudeAgentRunId;
  const { workItemId } = await enqueueWorkItem({
    purpose,
    targetKind,
    targetId: resolvedTargetId,
    payload: {
      ...payload,
      content: trimmed,
      claudeAgentRunId,
    },
  });

  const now = dateTimeModule.nowIso();
  runSyncedWrite({
    write: ({ db, syncVersion }) => {
      db.insert(claudeAgentRuns)
        .values({
          id: claudeAgentRunId,
          workItemId,
          status: "queued",
          payloadJson: JSON.stringify({ content: trimmed, ...payload }),
          syncVersion,
          syncDeleted: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    },
  });

  return { workItemId, claudeAgentRunId };
}
