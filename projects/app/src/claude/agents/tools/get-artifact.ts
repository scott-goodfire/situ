import { z } from "zod";

import { artifactRepository } from "@situ/research-records";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  artifactId: z.string().describe("Artifact id to read."),
});

export const getArtifactTool = defineTool({
  name: "get_artifact",
  description: "Read one situ artifact.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      artifact: await artifactRepository.require({
        artifactId: input.artifactId,
      }),
    }),
});
