import { z } from "zod";

import type { ClaudeAgentRole } from "../../roles";
import type { ClaudeAgentToolDefinition } from "../types";
import { defineTool } from "./define-tool";

function define({
  name,
  description,
  roles,
  idKey,
  idDescription,
  handler,
  resultKey,
}: {
  name: string;
  description: string;
  roles: readonly ClaudeAgentRole[];
  idKey: string;
  idDescription: string;
  handler: (input: { id: string; comment: string; actorAgentId?: string }) => Promise<unknown>;
  resultKey: string;
}): ClaudeAgentToolDefinition {
  const inputSchema = z.object({
    [idKey]: z.string().describe(idDescription),
    comment: z.string().describe("Short transition comment explaining the decision."),
  });
  return defineTool({
    name,
    description,
    roles,
    inputSchema,
    handler: async ({ input, context }) => {
      const record = input as Record<string, string>;
      return {
        [resultKey]: await handler({
          id: record[idKey] as string,
          comment: record.comment as string,
          actorAgentId: context.agentId,
        }),
      };
    },
  });
}

export const toolTransitionModule = {
  define,
} as const;
