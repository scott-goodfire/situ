import type { ClaudeAgentToolDefinition } from "./types";
import { baselineRepository } from "../../../data/repositories/baselines";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const completeBaselineTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "complete_baseline",
  description: "Mark a baseline done with a transition comment.",
  roles: scienceRoles,
  idKey: "baselineId",
  idDescription: "Baseline id to complete.",
  handler: ({ id, comment, actorAgentId }) =>
    baselineRepository.complete({ baselineId: id, comment, actorAgentId }),
  resultKey: "baseline",
});
