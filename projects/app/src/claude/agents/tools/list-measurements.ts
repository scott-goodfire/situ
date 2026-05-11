import { z } from "zod";

import { measurementRepository } from "../../../data/repositories/measurements";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listMeasurementsTool = defineTool({
  name: "list_measurements",
  description: "List recent situ measurements.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      measurements: await measurementRepository.list({
        limit: input.limit ?? 10,
      }),
    }),
});
