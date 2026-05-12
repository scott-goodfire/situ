import { z } from "zod";

import { evaluationRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  evaluationId: z.string().describe("Evaluation id to read."),
});

export const getEvaluationTool = defineTool({
  name: "get_evaluation",
  description: "Read one situ evaluation with activities and measurements.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      result: await evaluationRepository.getWithActivities({
        evaluationId: input.evaluationId,
      }),
    }),
});
