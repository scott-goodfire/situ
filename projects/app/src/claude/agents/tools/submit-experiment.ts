import type { ClaudeAgentToolDefinition } from "./types";
import { experimentRepository } from "../../../data/repositories/experiments";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const submitExperimentTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "submit_experiment",
  description: "Submit an experiment for review with a transition comment.",
  roles: scienceRoles,
  idKey: "experimentId",
  idDescription: "Experiment id to submit.",
  handler: ({ id, comment, actorAgentId }) =>
    experimentRepository.submit({ experimentId: id, comment, actorAgentId }),
  resultKey: "experiment",
});
