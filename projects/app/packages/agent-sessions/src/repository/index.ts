import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { NotFoundError } from "@situ/errors";

import { agentSessionLogs, agentSessions, type AgentSessionLogRow } from "../schema";
import type { AgentSessionLogRecord, AgentSessionRecord } from "../types";

export type CreateAgentSessionRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type AgentSessionByIdInput = {
  id: string;
};

export type AgentSessionsByAgentInput = {
  agentId: string;
};

export type AgentSessionWriteInput = {
  agentSession: AgentSessionRecord;
};

export type AgentSessionLogWriteInput = {
  log: AgentSessionLogRecord;
};

export type AgentSessionLogsBySessionInput = {
  agentSessionId: string;
};

export type AgentSessionRepository = {
  create(input: AgentSessionWriteInput): AgentSessionRecord;
  createLog(input: AgentSessionLogWriteInput): AgentSessionLogRecord;
  get(input: AgentSessionByIdInput): AgentSessionRecord | undefined;
  listByAgent(input: AgentSessionsByAgentInput): AgentSessionRecord[];
  listLogs(input: AgentSessionLogsBySessionInput): AgentSessionLogRecord[];
  require(input: AgentSessionByIdInput): AgentSessionRecord;
  update(input: AgentSessionWriteInput): AgentSessionRecord;
};

const encodeAgentSession = ({ agentSession }: AgentSessionWriteInput) => ({
  ...agentSession,
  contextTargetKind: agentSession.context?.targetKind,
  contextTargetId: agentSession.context?.targetId,
});

const decodeAgentSession = ({
  row,
}: {
  row: typeof agentSessions.$inferSelect;
}): AgentSessionRecord => ({
  id: row.id,
  agentId: row.agentId,
  parentAgentSessionId: row.parentAgentSessionId ?? undefined,
  remoteClaudeAgentId: row.remoteClaudeAgentId ?? undefined,
  remoteClaudeSessionId: row.remoteClaudeSessionId ?? undefined,
  remoteClaudeThreadId: row.remoteClaudeThreadId ?? undefined,
  context:
    row.contextTargetKind === null || row.contextTargetId === null
      ? undefined
      : {
          targetKind: row.contextTargetKind,
          targetId: row.contextTargetId,
        },
  currentNotificationId: row.currentNotificationId ?? undefined,
  status: row.status,
  lastActivityAt: row.lastActivityAt,
  remoteEventCursor: row.remoteEventCursor ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const encodeLog = ({ log }: AgentSessionLogWriteInput) => ({
  ...log,
  remoteId: log.remoteId,
  payloadJson: JSON.stringify(log.payload),
});

const decodeLog = ({ row }: { row: AgentSessionLogRow }): AgentSessionLogRecord => ({
  id: row.id,
  agentSessionId: row.agentSessionId,
  type: row.type,
  remoteId: row.remoteId ?? undefined,
  summary: row.summary,
  payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
  createdAt: row.createdAt,
});

/**
 * Creates an agent session repository.
 */
export const createAgentSessionRepository = ({
  db,
}: CreateAgentSessionRepositoryInput): AgentSessionRepository => {
  const repository: AgentSessionRepository = {
    create({ agentSession }) {
      db.insert(agentSessions).values(encodeAgentSession({ agentSession })).run();
      return agentSession;
    },

    createLog({ log }) {
      db.insert(agentSessionLogs).values(encodeLog({ log })).run();
      return log;
    },

    get({ id }) {
      const row = db.select().from(agentSessions).where(eq(agentSessions.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return decodeAgentSession({ row });
    },

    listByAgent({ agentId }) {
      return db
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.agentId, agentId))
        .all()
        .map((row) => decodeAgentSession({ row }));
    },

    listLogs({ agentSessionId }) {
      return db
        .select()
        .from(agentSessionLogs)
        .where(eq(agentSessionLogs.agentSessionId, agentSessionId))
        .all()
        .map((row) => decodeLog({ row }));
    },

    require({ id }) {
      const agentSession = repository.get({ id });

      if (agentSession !== undefined) {
        return agentSession;
      }

      throw new NotFoundError({
        details: {
          id,
          resource: "AgentSession",
        },
        message: `Agent session not found: ${id}`,
      });
    },

    update({ agentSession }) {
      db.update(agentSessions)
        .set(encodeAgentSession({ agentSession }))
        .where(eq(agentSessions.id, agentSession.id))
        .run();

      return agentSession;
    },
  };

  return repository;
};
