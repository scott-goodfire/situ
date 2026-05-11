import { z } from "zod";

import { computeTargetRepository } from "@situ/compute";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  computeTargetId: z.string().describe("Compute target id."),
});

export const getComputeTargetTool = defineTool({
  name: "get_compute_target",
  description: "Read one registered compute target by id.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      computeTarget: await computeTargetRepository.require({
        computeTargetId: input.computeTargetId,
      }),
    }),
});
