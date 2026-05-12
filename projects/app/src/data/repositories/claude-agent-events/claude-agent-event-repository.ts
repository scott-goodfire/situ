import { and, desc, eq, gte } from "drizzle-orm";

import { getDb } from "../../db/client";
import { claudeAgentEvents } from "../../db/schema";
import { clampRepositoryLimit } from "../__shared__";

export type ClaudeAgentEventRecord = typeof claudeAgentEvents.$inferSelect;

export const claudeAgentEventRepository = {
  async list({
    since,
    type,
    agentId,
    limit,
  }: {
    since?: string;
    type?: string;
    agentId?: string;
    limit?: number;
  }): Promise<ClaudeAgentEventRecord[]> {
    const filters = [] as ReturnType<typeof eq>[];
    if (since) {
      filters.push(gte(claudeAgentEvents.createdAt, since));
    }
    if (type) {
      filters.push(eq(claudeAgentEvents.type, type));
    }
    if (agentId) {
      filters.push(eq(claudeAgentEvents.agentId, agentId));
    }
    const rows = await getDb().query.claudeAgentEvents.findMany({
      where: filters.length > 0 ? and(...filters) : undefined,
      orderBy: [desc(claudeAgentEvents.createdAt)],
    });
    return rows.slice(0, clampRepositoryLimit({ limit }));
  },
};
