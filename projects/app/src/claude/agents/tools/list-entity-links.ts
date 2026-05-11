import { z } from "zod";

import { entityLinkRepository } from "../../../data/repositories/entity-links";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listEntityLinksTool = defineTool({
  name: "list_entity_links",
  description: "List recent Situ entity links.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    entityLinks: await entityLinkRepository.list({
      limit: input.limit ?? 10,
    }),
  }),
});
