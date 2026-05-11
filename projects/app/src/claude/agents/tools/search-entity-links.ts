import { z } from "zod";

import { entityLinkRepository } from "../../../data/repositories/entity-links";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";
import { ENTITY_KINDS } from "./__shared__/tool-entity-reference-module";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  fromKind: z.enum(ENTITY_KINDS).describe("Optional source entity kind.").optional(),
  fromId: z.string().describe("Optional source entity id.").optional(),
  toKind: z.enum(ENTITY_KINDS).describe("Optional target entity kind.").optional(),
  toId: z.string().describe("Optional target entity id.").optional(),
  relationship: z.string().describe("Optional relationship label.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchEntityLinksTool = defineTool({
  name: "search_entity_links",
  description: "Search situ entity links by endpoint or relationship.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    entityLinks: await entityLinkRepository.search({
      query: input.query,
      fromKind: input.fromKind,
      fromId: input.fromId,
      toKind: input.toKind,
      toId: input.toId,
      relationship: input.relationship,
      limit: input.limit ?? 10,
    }),
  }),
});
