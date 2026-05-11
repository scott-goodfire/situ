import { z } from "zod";

import { entityLinkRepository } from "../../../data/repositories/entity-links";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  entityLinkId: z.string().describe("Entity link id to read."),
});

export const getEntityLinkTool = defineTool({
  name: "get_entity_link",
  description: "Read one Situ entity link.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    entityLink: await entityLinkRepository.require({
      entityLinkId: input.entityLinkId,
    }),
  }),
});
