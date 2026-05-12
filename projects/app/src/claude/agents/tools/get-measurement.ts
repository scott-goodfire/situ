import { z } from "zod";

import { measurementRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  measurementId: z.string().describe("Measurement id to read."),
});

export const getMeasurementTool = defineTool({
  name: "get_measurement",
  description: "Read one situ measurement.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      measurement: await measurementRepository.require({
        measurementId: input.measurementId,
      }),
    }),
});
