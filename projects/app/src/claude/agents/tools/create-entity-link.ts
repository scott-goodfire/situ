import { z } from "zod";

import { entityLinkRepository } from "@situ/research-records";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { ENTITY_KINDS, toolEntityReferenceModule } from "./__shared__/tool-entity-reference-module";

const inputSchema = z.object({
  fromKind: z.enum(ENTITY_KINDS).describe("Source entity kind."),
  fromId: z.string().describe("Source entity id."),
  toKind: z.enum(ENTITY_KINDS).describe("Target entity kind."),
  toId: z.string().describe("Target entity id."),
  relationship: z.string().describe("Relationship label."),
});

export const createEntityLinkTool = defineTool({
  name: "create_entity_link",
  description: "Record a durable relationship between two situ entities.",
  roles: ["scientist"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) => {
    await Promise.all([
      toolEntityReferenceModule.assertExists({ kind: input.fromKind, id: input.fromId }),
      toolEntityReferenceModule.assertExists({ kind: input.toKind, id: input.toId }),
    ]);
    return Result.ok({
      entityLink: await entityLinkRepository.create({
        fromKind: input.fromKind,
        fromId: input.fromId,
        toKind: input.toKind,
        toId: input.toId,
        relationship: input.relationship,
      }),
    });
  },
});
