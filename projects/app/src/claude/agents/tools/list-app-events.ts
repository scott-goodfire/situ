import { z } from "zod";

import { appEventRepository } from "../../../data/repositories/app-events";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listAppEventsTool = defineTool({
  name: "list_app_events",
  description: "List recent app events.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      appEvents: await appEventRepository.list({
        limit: input.limit ?? 20,
      }),
    }),
});
