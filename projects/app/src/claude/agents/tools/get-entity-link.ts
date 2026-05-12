import { z } from "zod";

import { entityLinkRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  entityLinkId: z.string().describe("Entity link id to read."),
});

export const getEntityLinkTool = defineTool({
  name: "get_entity_link",
  description: "Read one situ entity link.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      entityLink: await entityLinkRepository.require({
        entityLinkId: input.entityLinkId,
      }),
    }),
});
