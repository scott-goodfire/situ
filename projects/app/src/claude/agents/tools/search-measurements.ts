import { z } from "zod";

import { measurementRepository } from "../../../data/repositories/measurements";
import { defineTool } from "./__shared__/define-tool";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  query: z.string().describe("Optional search text.").optional(),
  evaluationId: z.string().describe("Optional evaluation id.").optional(),
  researchTaskId: z.string().describe("Optional ResearchTask id.").optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const searchMeasurementsTool = defineTool({
  name: "search_measurements",
  description: "Search Situ measurements by body, actor, ResearchTask, evaluation, or payload.",
  roles: allRoles,
  inputSchema,
  handler: async ({ input }) => ({
    measurements: await measurementRepository.search({
      query: input.query,
      evaluationId: input.evaluationId,
      researchTaskId: input.researchTaskId,
      limit: input.limit ?? 10,
    }),
  }),
});
