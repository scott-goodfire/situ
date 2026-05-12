import { z } from "zod";

import { artifactRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { ENTITY_KINDS, toolEntityReferenceModule } from "./__shared__/tool-entity-reference-module";

const inputSchema = z
  .object({
    title: z.string().describe("Natural human artifact title, usually 5-14 words."),
    path: z
      .string()
      .describe(
        "Optional local or logical artifact path. Omit for inline report/rationale artifacts stored in body.",
      )
      .optional(),
    kind: z.string().describe("Artifact kind such as patch, log, report, or file."),
    body: z
      .string()
      .describe(
        "Optional inline artifact text. Keep report, synthesis, and pruning-rationale bodies human-sounding, sectioned, and evidence-backed.",
      )
      .optional(),
    entityKind: z.enum(ENTITY_KINDS).describe("Linked entity kind."),
    entityId: z.string().describe("Linked entity id."),
    mediaType: z.string().describe("Optional media type.").optional(),
    sizeBytes: z.number().describe("Optional size in bytes.").optional(),
  })
  .refine((input) => Boolean(input.path?.trim()) || Boolean(input.body?.trim()), {
    message: "create_artifact requires either path or body.",
    path: ["path"],
  });

export const createArtifactTool = defineTool({
  name: "create_artifact",
  description:
    "Record a durable artifact connected to a ResearchTask, hypothesis, baseline, experiment, or evaluation.",
  roles: ["scientist"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    await toolEntityReferenceModule.assertExists({
      kind: input.entityKind,
      id: input.entityId,
    });
    return Result.ok({
      artifact: await artifactRepository.create({
        title: input.title,
        path: input.path,
        kind: input.kind,
        body: input.body,
        entityKind: input.entityKind,
        entityId: input.entityId,
        createdByResearchTaskId: context.activeResearchTaskId,
        createdByAgentId: context.agentId,
        mediaType: input.mediaType,
        sizeBytes: input.sizeBytes,
      }),
    });
  },
});
