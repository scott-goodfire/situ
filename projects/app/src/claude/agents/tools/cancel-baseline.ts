import type { ClaudeAgentToolDefinition } from "./types";
import { baselineRepository } from "../../../data/repositories/baselines";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const cancelBaselineTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "cancel_baseline",
  description: "Cancel a baseline with a transition comment.",
  roles: scienceRoles,
  idKey: "baselineId",
  idDescription: "Baseline id to cancel.",
  handler: ({ id, comment, actorAgentId }) =>
    baselineRepository.cancel({ baselineId: id, comment, actorAgentId }),
  resultKey: "baseline",
});
