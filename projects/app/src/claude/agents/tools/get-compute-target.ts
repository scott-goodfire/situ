import { z } from "zod";

import { computeTargetRepository } from "../../../data/repositories/compute-targets";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  computeTargetId: z.string().describe("Compute target id."),
});

export const getComputeTargetTool = defineTool({
  name: "get_compute_target",
  description: "Read one registered compute target by id.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    computeTarget: await computeTargetRepository.require({
      computeTargetId: input.computeTargetId,
    }),
  }),
});
