import type { ClaudeAgentToolDefinition } from "./types";
import { baselineRepository } from "../../../data/repositories/baselines";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const submitBaselineTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "submit_baseline",
  description: "Submit a baseline for review with a transition comment.",
  roles: scienceRoles,
  idKey: "baselineId",
  idDescription: "Baseline id to submit.",
  handler: ({ id, comment, actorAgentId }) =>
    baselineRepository.submit({ baselineId: id, comment, actorAgentId }),
  resultKey: "baseline",
});
