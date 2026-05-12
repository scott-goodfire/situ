import { z } from "zod";

import { workItemRepository } from "@situ/work-items";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  status: z
    .enum(["pending", "claimed", "done", "failed", "canceled"])
    .describe("Optional work-item status filter.")
    .optional(),
  purposePrefix: z
    .string()
    .describe(
      "Optional purpose prefix filter, e.g. 'claude.' to include only Claude agent work items.",
    )
    .optional(),
  since: z.string().describe("Optional ISO timestamp lower bound on updatedAt.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listWorkItemsTool = defineTool({
  name: "list_work_items",
  description:
    "List durable work_items rows ordered by most recently updated. Use to see what is pending or actively claimed by an agent.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      workItems: await workItemRepository.list({
        status: input.status,
        purposePrefix: input.purposePrefix,
        since: input.since,
        limit: input.limit ?? 20,
      }),
    }),
});
