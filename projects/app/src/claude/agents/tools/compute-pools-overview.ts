import { z } from "zod";

import { computePoolsOverview } from "./__shared__/compute-pools-overview";
import { defineTool } from "./define-tool";
import { Result } from "@situ/agent-tools";
import { allRoles } from "./__shared__/roles";

export const computePoolsOverviewTool = defineTool({
  name: "compute_pools_overview",
  description: "Read compute pool capacity and lease status without claiming or mutating targets.",
  roles: allRoles,
  inputSchema: z.object({}),
  resultEnvelope: true,
  handler: async () =>
    Result.ok({
      overview: await computePoolsOverview(),
    }),
});
