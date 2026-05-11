import type { ClaudeAgentToolDefinition } from "./types";
import { baselineRepository } from "../../../data/repositories/baselines";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const acceptBaselineTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "accept_baseline",
  description: "Accept a baseline with a transition comment.",
  roles: scienceRoles,
  idKey: "baselineId",
  idDescription: "Baseline id to accept.",
  handler: ({ id, comment, actorAgentId }) =>
    baselineRepository.accept({ baselineId: id, comment, actorAgentId }),
  resultKey: "baseline",
});
