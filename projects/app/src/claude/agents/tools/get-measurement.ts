import { z } from "zod";

import { measurementRepository } from "../../../data/repositories/measurements";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  measurementId: z.string().describe("Measurement id to read."),
});

export const getMeasurementTool = defineTool({
  name: "get_measurement",
  description: "Read one situ measurement.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    measurement: await measurementRepository.require({
      measurementId: input.measurementId,
    }),
  }),
});
