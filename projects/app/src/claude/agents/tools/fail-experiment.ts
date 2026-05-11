import type { ClaudeAgentToolDefinition } from "./types";
import { experimentRepository } from "../../../data/repositories/experiments";
import { scienceRoles } from "./__shared__/roles";
import { toolTransitionModule } from "./__shared__/tool-transition-module";

export const failExperimentTool: ClaudeAgentToolDefinition = toolTransitionModule.define({
  name: "fail_experiment",
  description: "Mark an experiment failed with a transition comment.",
  roles: scienceRoles,
  idKey: "experimentId",
  idDescription: "Experiment id to fail.",
  handler: ({ id, comment, actorAgentId }) =>
    experimentRepository.fail({ experimentId: id, comment, actorAgentId }),
  resultKey: "experiment",
});
