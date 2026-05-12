import { z } from "zod";

import { entityLinkRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listEntityLinksTool = defineTool({
  name: "list_entity_links",
  description: "List recent situ entity links.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      entityLinks: await entityLinkRepository.list({
        limit: input.limit ?? 10,
      }),
    }),
});
