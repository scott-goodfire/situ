import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { createAgentRepository } from ".";
import type { AgentRecord } from "../types";

const createAgent = (): AgentRecord => ({
  id: "agent_1",
  name: "Scientist 1",
  role: "scientist",
  instructionsMarkdown: "Explore promising candidates.",
  status: "active",
  createdAt: "2026-05-12T12:00:00.000Z",
  updatedAt: "2026-05-12T12:00:00.000Z",
});

test("creates, lists, and updates agents", () => {
  const db = drizzle(new Database(":memory:"));
  db.run(`
    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      instructions_markdown TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const agents = createAgentRepository({ db });
  const agent = createAgent();

  agents.create({ agent });

  expect(agents.require({ id: agent.id }).name).toBe("Scientist 1");
  expect(agents.list()).toHaveLength(1);

  const updated = agents.update({
    agent: {
      ...agent,
      status: "paused",
      updatedAt: "2026-05-12T12:01:00.000Z",
    },
  });

  expect(updated.status).toBe("paused");
  expect(agents.require({ id: agent.id }).status).toBe("paused");
});
