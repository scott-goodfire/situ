import type { ClaudeAgentToolDefinition } from "./types";
import { experimentRepository } from "../../../data/repositories/experiments";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const cancelExperimentTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "cancel_experiment",
  description: "Cancel an experiment with a transition comment.",
  roles: scienceRoles,
  idKey: "experimentId",
  idDescription: "Experiment id to cancel.",
  handler: ({ id, comment, actorAgentId }) =>
    experimentRepository.cancel({ experimentId: id, comment, actorAgentId }),
  resultKey: "experiment",
});
