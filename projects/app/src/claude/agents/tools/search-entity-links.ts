import { z } from "zod";

import { entityLinkRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
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
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
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
