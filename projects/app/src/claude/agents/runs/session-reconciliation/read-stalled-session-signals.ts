import { and, desc, eq, gt, sql } from "drizzle-orm";

import { getDb } from "../../../../data/db/client";
import { claudeAgentEvents, claudeAgents } from "../../../../data/db/schema";

export type StalledSessionSignals = {
  /** Wall-clock moment the current session was most recently attached or swapped. */
  sessionAttachedAt: Date;
  /** Count of session.status_idle events with stop_reason.type=retries_exhausted since attach. */
  exhaustedRetryCountSinceAttach: number;
  /** True when a non-error span.model_request_end landed after the most recent exhausted event. */
  hadSuccessAfterMostRecentExhausted: boolean;
};

export async function readStalledSessionSignals({
  agentId,
}: {
  agentId: string;
}): Promise<StalledSessionSignals> {
  const db = getDb();
  const agent = await db.query.claudeAgents.findFirst({
    where: eq(claudeAgents.id, agentId),
  });
  if (!agent) {
    return {
      sessionAttachedAt: new Date(0),
      exhaustedRetryCountSinceAttach: 0,
      hadSuccessAfterMostRecentExhausted: false,
    };
  }
  const sessionAttachedAt = new Date(agent.updatedAt);

  const exhaustedRows = await db
    .select({ createdAt: claudeAgentEvents.createdAt })
    .from(claudeAgentEvents)
    .where(
      and(
        eq(claudeAgentEvents.agentId, agentId),
        eq(claudeAgentEvents.type, "session.status_idle"),
        gt(claudeAgentEvents.createdAt, agent.updatedAt),
        sql`json_extract(${claudeAgentEvents.payloadJson}, '$.stop_reason.type') = 'retries_exhausted'`,
      ),
    )
    .orderBy(desc(claudeAgentEvents.createdAt));

  const exhaustedRetryCountSinceAttach = exhaustedRows.length;
  const mostRecentExhaustedAt = exhaustedRows[0]?.createdAt;

  let hadSuccessAfterMostRecentExhausted = false;
  if (mostRecentExhaustedAt) {
    const successRow = await db
      .select({ id: claudeAgentEvents.id })
      .from(claudeAgentEvents)
      .where(
        and(
          eq(claudeAgentEvents.agentId, agentId),
          eq(claudeAgentEvents.type, "span.model_request_end"),
          gt(claudeAgentEvents.createdAt, mostRecentExhaustedAt),
          sql`json_extract(${claudeAgentEvents.payloadJson}, '$.is_error') = 0`,
        ),
      )
      .limit(1);
    hadSuccessAfterMostRecentExhausted = successRow.length > 0;
  }

  return {
    sessionAttachedAt,
    exhaustedRetryCountSinceAttach,
    hadSuccessAfterMostRecentExhausted,
  };
}
