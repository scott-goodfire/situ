import { z } from "zod";

import { artifactRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listArtifactsTool = defineTool({
  name: "list_artifacts",
  description: "List recent situ artifacts.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      artifacts: await artifactRepository.list({
        limit: input.limit ?? 10,
      }),
    }),
});
