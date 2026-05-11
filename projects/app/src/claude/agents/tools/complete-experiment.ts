import type { ClaudeAgentToolDefinition } from "./types";
import { experimentRepository } from "../../../data/repositories/experiments";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const completeExperimentTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "complete_experiment",
  description: "Mark an experiment done with a transition comment.",
  roles: scienceRoles,
  idKey: "experimentId",
  idDescription: "Experiment id to complete.",
  handler: ({ id, comment, actorAgentId }) =>
    experimentRepository.complete({ experimentId: id, comment, actorAgentId }),
  resultKey: "experiment",
});
