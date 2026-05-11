import { z } from "zod";

import { artifactRepository } from "../../../data/repositories/artifacts";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  artifactId: z.string().describe("Artifact id to read."),
});

export const getArtifactTool = defineTool({
  name: "get_artifact",
  description: "Read one situ artifact.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    artifact: await artifactRepository.require({
      artifactId: input.artifactId,
    }),
  }),
});
