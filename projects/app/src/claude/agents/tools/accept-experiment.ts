import type { ClaudeAgentToolDefinition } from "./types";
import { experimentRepository } from "../../../data/repositories/experiments";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const acceptExperimentTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "accept_experiment",
  description: "Accept an experiment with a transition comment.",
  roles: scienceRoles,
  idKey: "experimentId",
  idDescription: "Experiment id to accept.",
  handler: ({ id, comment, actorAgentId }) =>
    experimentRepository.accept({ experimentId: id, comment, actorAgentId }),
  resultKey: "experiment",
});
