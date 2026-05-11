import { z } from "zod";

import { appEventRepository } from "../../../data/repositories/app-events";
import { defineTool } from "./__shared__/define-tool";
import { Result } from "./__shared__/result";
import { allRoles } from "./__shared__/roles";

const inputSchema = z.object({
  appEventId: z.number().describe("AppEvent id."),
});

export const getAppEventTool = defineTool({
  name: "get_app_event",
  description: "Read one app event.",
  roles: allRoles,
  inputSchema,
  resultEnvelope: true,
  handler: async ({ input }) =>
    Result.ok({
      appEvent: await appEventRepository.require({ appEventId: input.appEventId }),
    }),
});
