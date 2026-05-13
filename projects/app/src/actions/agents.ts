import { createSyncMetadata } from "@situ/common";
import type { AgentRecord } from "@situ/agents";

import { resolveActionActor } from "./actors";
import { recordEvent } from "./events";
import type { AppRepositories } from "./repositories";
import { targetForAgent } from "./targets";
import type { Clock, CreateAgentInput, IdFactory } from "./types";

export type CreateAgentActionInput = {
  createId: IdFactory;
  input: CreateAgentInput;
  now: Clock;
  repositories: AppRepositories;
};

/**
 * Creates an agent.
 */
export const createAgentAction = ({
  createId,
  input,
  now,
  repositories,
}: CreateAgentActionInput): AgentRecord => {
  const actor = resolveActionActor({
    actor: input.actor,
    repositories,
  });
  const timestamp = now();
  const agent = repositories.agents.create({
    agent: {
      id: input.id ?? createId("agent"),
      instructionsMarkdown: input.instructionsMarkdown,
      name: input.name,
      role: input.role,
      ...createSyncMetadata(),
      status: input.status ?? "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  });

  recordEvent({
    createId,
    event: {
      actor,
      message: "Agent created",
      payload: {
        agentId: agent.id,
        role: agent.role,
      },
      target: targetForAgent({ agent }),
      type: "agent.created",
    },
    now,
    repositories,
  });

  return agent;
};
