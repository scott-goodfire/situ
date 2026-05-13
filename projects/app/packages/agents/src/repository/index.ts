import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { NotFoundError } from "@situ/errors";

import { agents } from "../schema";
import type { AgentRecord } from "../types";

export type CreateAgentRepositoryInput = {
  db: BunSQLiteDatabase<Record<string, unknown>>;
};

export type AgentByIdInput = {
  id: string;
};

export type AgentWriteInput = {
  agent: AgentRecord;
};

export type AgentRepository = {
  create(input: AgentWriteInput): AgentRecord;
  get(input: AgentByIdInput): AgentRecord | undefined;
  list(): AgentRecord[];
  require(input: AgentByIdInput): AgentRecord;
  update(input: AgentWriteInput): AgentRecord;
};

/**
 * Creates an agent repository.
 */
export const createAgentRepository = ({ db }: CreateAgentRepositoryInput): AgentRepository => {
  const repository: AgentRepository = {
    create({ agent }) {
      db.insert(agents).values(agent).run();
      return agent;
    },

    get({ id }) {
      const row = db.select().from(agents).where(eq(agents.id, id)).get();

      if (row === undefined) {
        return undefined;
      }

      return row;
    },

    list() {
      return db.select().from(agents).all();
    },

    require({ id }) {
      const agent = repository.get({ id });

      if (agent !== undefined) {
        return agent;
      }

      throw new NotFoundError({
        details: {
          id,
          resource: "Agent",
        },
        message: `Agent not found: ${id}`,
      });
    },

    update({ agent }) {
      db.update(agents).set(agent).where(eq(agents.id, agent.id)).run();
      return agent;
    },
  };

  return repository;
};
