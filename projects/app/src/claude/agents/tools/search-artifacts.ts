import { z } from "zod";

import { artifactRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";
import { ENTITY_KINDS } from "./__shared__/tool-entity-reference-module";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  entityKind: z.enum(ENTITY_KINDS).describe("Optional linked entity kind.").optional(),
  entityId: z.string().describe("Optional linked entity id.").optional(),
  kind: z.string().describe("Optional artifact kind.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchArtifactsTool = defineTool({
  name: "search_artifacts",
  description: "Search situ artifacts by title, path, kind, or linked entity.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      artifacts: await artifactRepository.search({
        query: input.query,
        entityKind: input.entityKind,
        entityId: input.entityId,
        kind: input.kind,
        limit: input.limit ?? 10,
      }),
    }),
});
