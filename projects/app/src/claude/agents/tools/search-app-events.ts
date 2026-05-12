import { z } from "zod";

import { appEventRepository } from "../../../data/repositories/app-events";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  query: z.string().describe("Optional substring search across type and message.").optional(),
  type: z.string().describe("Optional exact event type filter.").optional(),
  since: z.string().describe("Optional ISO timestamp lower bound on createdAt.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchAppEventsTool = defineTool({
  name: "search_app_events",
  description: "Search app events by type, message text, or recency.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      appEvents: await appEventRepository.search({
        query: input.query,
        type: input.type,
        since: input.since,
        limit: input.limit ?? 20,
      }),
    }),
});
