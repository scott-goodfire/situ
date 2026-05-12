import { z } from "zod";

import { claudeAgentEventRepository } from "../../../data/repositories/claude-agent-events";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  since: z
    .string()
    .describe("Optional ISO timestamp lower bound on createdAt. Use to read recent activity.")
    .optional(),
  type: z
    .string()
    .describe("Optional exact event type filter, e.g. 'agent.custom_tool_use' or 'agent.thinking'.")
    .optional(),
  agentId: z.string().describe("Optional Claude agent id filter.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listClaudeAgentEventsTool = defineTool({
  name: "list_claude_agent_events",
  description:
    "List durable claude_agent_events rows ordered by most recent. Use to see whether Claude Managed Agents are actively producing events (thinking, tool calls, model responses) within a time window.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      claudeAgentEvents: await claudeAgentEventRepository.list({
        since: input.since,
        type: input.type,
        agentId: input.agentId,
        limit: input.limit ?? 50,
      }),
    }),
});
