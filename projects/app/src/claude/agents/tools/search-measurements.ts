import { z } from "zod";

import { measurementRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  evaluationId: z.string().describe("Optional evaluation id.").optional(),
  researchTaskId: z.string().describe("Optional ResearchTask id.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchMeasurementsTool = defineTool({
  name: "search_measurements",
  description: "Search situ measurements by body, actor, ResearchTask, evaluation, or payload.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      measurements: await measurementRepository.search({
        query: input.query,
        evaluationId: input.evaluationId,
        researchTaskId: input.researchTaskId,
        limit: input.limit ?? 10,
      }),
    }),
});
