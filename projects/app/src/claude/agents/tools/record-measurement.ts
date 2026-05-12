import { z } from "zod";

import { measurementRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  body: z
    .string()
    .describe(
      "Compact human-sounding measurement note: ideal is 1-2 sentences plus raw output only when useful.",
    ),
  evaluationId: z.string().describe("Evaluation id."),
  researchTaskId: z
    .string()
    .describe("Optional ResearchTask id. Defaults to the active ResearchTask.")
    .optional(),
  payload: z
    .record(z.string(), z.unknown())
    .describe("Optional structured measurement payload.")
    .optional(),
});

export const recordMeasurementTool = defineTool({
  name: "record_measurement",
  description: "Record a durable measurement or observation from Scientist work.",
  roles: ["scientist"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) =>
    Result.ok({
      measurement: await measurementRepository.record({
        body: input.body,
        evaluationId: input.evaluationId,
        createdByResearchTaskId: toolContextModule.researchTaskId({
          explicit: input.researchTaskId,
          context,
          required: false,
        }),
        createdByAgentId: context.agentId,
        payload: input.payload ?? {},
      }),
    }),
});
