import { z } from "zod";

import { measurementRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
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
