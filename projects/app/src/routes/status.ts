import { Hono } from "hono";
import { ensureLocalSession } from "../claude/agents/resources";
import { getRuntimeContext } from "../config/session-context";
import { getDb } from "../data/db/client";

export const statusRoutes = new Hono();

statusRoutes.get("/status", async (c) => {
  const db = getDb();
  const session = await ensureLocalSession();
  const agent = await db.query.claudeAgents.findFirst();
  const environment = await db.query.claudeAgentEnvironments.findFirst();
  return c.json({
    agent,
    environment,
    session,
  });
});

statusRoutes.get("/bootstrap", async (c) => {
  const runtime = getRuntimeContext();
  const session = await ensureLocalSession();
  return c.json({
    session,
    sessionId: runtime.sessionId,
    replicacheName: runtime.replicacheName,
    workspaceKey: runtime.workspaceKey,
    repoPath: runtime.repoPath,
  });
});
