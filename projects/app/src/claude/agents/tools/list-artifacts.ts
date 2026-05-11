import { z } from "zod";

import { artifactRepository } from "../../../data/repositories/artifacts";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listArtifactsTool = defineTool({
  name: "list_artifacts",
  description: "List recent situ artifacts.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    artifacts: await artifactRepository.list({
      limit: input.limit ?? 10,
    }),
  }),
});
