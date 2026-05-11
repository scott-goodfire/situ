import { z } from "zod";

import { feedEntryRepository } from "../../../data/repositories/feed-entries";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  summaryMarkdown: z
    .string()
    .describe("1–2 short paragraphs narrating what happened in this window."),
  severity: z
    .enum(["info", "progress", "stuck", "failure"])
    .describe("Dominant tone of the window."),
  citedAppEventIds: z
    .array(z.string())
    .describe("App event IDs referenced inline in the summary.")
    .default([]),
  windowStartedAt: z
    .string()
    .describe("ISO timestamp marking the start of the window this entry covers."),
  windowEndedAt: z
    .string()
    .describe("ISO timestamp marking the end of the window this entry covers."),
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject if omitted.")
    .optional(),
});

export const writeFeedEntryTool = defineTool({
  name: "write_feed_entry",
  description:
    "Append a narration entry to the workspace feed. The Scribe calls this once per turn.",
  roles: ["scribe"],
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProjectId = toolContextModule.researchProjectId({
      explicit: input.researchProjectId,
      context,
    });
    return Result.ok({
      feedEntry: await feedEntryRepository.create({
        researchProjectId,
        summaryMarkdown: input.summaryMarkdown,
        severity: input.severity,
        citedAppEventIds: input.citedAppEventIds,
        windowStartedAt: input.windowStartedAt,
        windowEndedAt: input.windowEndedAt,
        createdByAgentId: context.agentId,
      }),
    });
  },
});
