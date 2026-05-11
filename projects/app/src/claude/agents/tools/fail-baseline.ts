import type { ClaudeAgentToolDefinition } from "./types";
import { baselineRepository } from "../../../data/repositories/baselines";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const failBaselineTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "fail_baseline",
  description: "Mark a baseline failed with a transition comment.",
  roles: scienceRoles,
  idKey: "baselineId",
  idDescription: "Baseline id to fail.",
  handler: ({ id, comment, actorAgentId }) =>
    baselineRepository.fail({ baselineId: id, comment, actorAgentId }),
  resultKey: "baseline",
});
