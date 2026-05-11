import { z } from "zod";

import { feedEntryRepository } from "../../../data/repositories/feed-entries";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";
import { toolContextModule } from "./__shared__/tool-context-module";

const inputSchema = z.object({
  researchProjectId: z
    .string()
    .describe("ResearchProject id. Defaults to the active ResearchProject if omitted.")
    .optional(),
  limit: z.number().describe("Maximum rows to return.").optional(),
});

export const listFeedEntriesTool = defineTool({
  name: "list_feed_entries",
  description: "List Scribe feed entries (running narration) for a ResearchProject, newest first.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    const researchProjectId = toolContextModule.researchProjectId({
      explicit: input.researchProjectId,
      context,
    });
    return Result.ok({
      feedEntries: await feedEntryRepository.list({
        researchProjectId,
        limit: input.limit,
      }),
    });
  },
});
