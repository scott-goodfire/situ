import type { BetaManagedAgentsCustomToolParams } from "@anthropic-ai/sdk/resources/beta/agents";

import type { ClaudeAgentExecutionMode, ClaudeAgentRole } from "../roles";
import type { ClaudeAgentToolDefinition } from "./types";
import { askUserQuestionTool } from "./ask-user-question";
import { createProjectBaselineTool } from "./create-project-baseline";
import { presentBaselineForConfirmationTool } from "./present-baseline-for-confirmation";
import { completeResearchProjectTool } from "./complete-research-project";
import { failResearchProjectTool } from "./fail-research-project";
import { runReadonlyWorkspaceCommandTool } from "./run-readonly-workspace-command";
import { createResearchTaskTool } from "./create-research-task";
import { getPlanningAdviceTool } from "./get-planning-advice";
import { getResearchTaskTool } from "./get-research-task";
import { searchResearchTasksTool } from "./search-research-tasks";
import { listResearchTasksTool } from "./list-research-tasks";
import { submitResearchTaskForVerificationTool } from "./submit-research-task-for-verification";
import { recordResearchTaskVerificationTool } from "./record-research-task-verification";
import { runReportCommandTool } from "./run-report-command";
import { writeFeedEntryTool } from "./write-feed-entry";
import { failResearchTaskTool } from "./fail-research-task";
import { createHypothesisTool } from "./create-hypothesis";
import { getHypothesisTool } from "./get-hypothesis";
import { listHypothesesTool } from "./list-hypotheses";
import { searchHypothesesTool } from "./search-hypotheses";
import { createBaselineTool } from "./create-baseline";
import { getBaselineTool } from "./get-baseline";
import { listBaselinesTool } from "./list-baselines";
import { searchBaselinesTool } from "./search-baselines";
import { addBaselineCommentTool } from "./add-baseline-comment";
import { acceptBaselineTool } from "./accept-baseline";
import { submitBaselineTool } from "./submit-baseline";
import { completeBaselineTool } from "./complete-baseline";
import { cancelBaselineTool } from "./cancel-baseline";
import { failBaselineTool } from "./fail-baseline";
import { createExperimentTool } from "./create-experiment";
import { getExperimentTool } from "./get-experiment";
import { listExperimentsTool } from "./list-experiments";
import { searchExperimentsTool } from "./search-experiments";
import { addExperimentCommentTool } from "./add-experiment-comment";
import { acceptExperimentTool } from "./accept-experiment";
import { submitExperimentTool } from "./submit-experiment";
import { completeExperimentTool } from "./complete-experiment";
import { cancelExperimentTool } from "./cancel-experiment";
import { failExperimentTool } from "./fail-experiment";
import { runWorkspaceCommandTool } from "./run-workspace-command";
import { captureExperimentCandidateTool } from "./capture-experiment-candidate";
import { createEvaluationTool } from "./create-evaluation";
import { getEvaluationTool } from "./get-evaluation";
import { listEvaluationsTool } from "./list-evaluations";
import { searchEvaluationsTool } from "./search-evaluations";
import { addEvaluationCommentTool } from "./add-evaluation-comment";
import { acceptEvaluationTool } from "./accept-evaluation";
import { submitEvaluationTool } from "./submit-evaluation";
import { completeEvaluationTool } from "./complete-evaluation";
import { cancelEvaluationTool } from "./cancel-evaluation";
import { failEvaluationTool } from "./fail-evaluation";
import { recordMeasurementTool } from "./record-measurement";
import { recordExperimentComparisonTool } from "./record-experiment-comparison";
import { getMeasurementTool } from "./get-measurement";
import { listMeasurementsTool } from "./list-measurements";
import { searchMeasurementsTool } from "./search-measurements";
import { createArtifactTool } from "./create-artifact";
import { getArtifactTool } from "./get-artifact";
import { listArtifactsTool } from "./list-artifacts";
import { searchArtifactsTool } from "./search-artifacts";
import { createEntityLinkTool } from "./create-entity-link";
import { getEntityLinkTool } from "./get-entity-link";
import { listEntityLinksTool } from "./list-entity-links";
import { searchEntityLinksTool } from "./search-entity-links";
import { computePoolsOverviewTool } from "./compute-pools-overview";
import { getComputeTargetTool } from "./get-compute-target";
import { listComputeTargetsTool } from "./list-compute-targets";
import { searchComputeTargetsTool } from "./search-compute-targets";
import { getAppEventTool } from "./get-app-event";
import { listAppEventsTool } from "./list-app-events";
import { searchAppEventsTool } from "./search-app-events";

export const claudeAgentToolDefinitions: readonly ClaudeAgentToolDefinition[] = [
  askUserQuestionTool,
  createProjectBaselineTool,
  presentBaselineForConfirmationTool,
  completeResearchProjectTool,
  failResearchProjectTool,
  runReadonlyWorkspaceCommandTool,
  createResearchTaskTool,
  getPlanningAdviceTool,
  getResearchTaskTool,
  searchResearchTasksTool,
  listResearchTasksTool,
  submitResearchTaskForVerificationTool,
  recordResearchTaskVerificationTool,
  writeFeedEntryTool,
  runReportCommandTool,
  failResearchTaskTool,
  createHypothesisTool,
  getHypothesisTool,
  listHypothesesTool,
  searchHypothesesTool,
  createBaselineTool,
  getBaselineTool,
  listBaselinesTool,
  searchBaselinesTool,
  addBaselineCommentTool,
  acceptBaselineTool,
  submitBaselineTool,
  completeBaselineTool,
  cancelBaselineTool,
  failBaselineTool,
  createExperimentTool,
  getExperimentTool,
  listExperimentsTool,
  searchExperimentsTool,
  addExperimentCommentTool,
  acceptExperimentTool,
  submitExperimentTool,
  completeExperimentTool,
  cancelExperimentTool,
  failExperimentTool,
  runWorkspaceCommandTool,
  captureExperimentCandidateTool,
  createEvaluationTool,
  getEvaluationTool,
  listEvaluationsTool,
  searchEvaluationsTool,
  addEvaluationCommentTool,
  acceptEvaluationTool,
  submitEvaluationTool,
  completeEvaluationTool,
  cancelEvaluationTool,
  failEvaluationTool,
  recordMeasurementTool,
  recordExperimentComparisonTool,
  getMeasurementTool,
  listMeasurementsTool,
  searchMeasurementsTool,
  createArtifactTool,
  getArtifactTool,
  listArtifactsTool,
  searchArtifactsTool,
  createEntityLinkTool,
  getEntityLinkTool,
  listEntityLinksTool,
  searchEntityLinksTool,
  computePoolsOverviewTool,
  getComputeTargetTool,
  listComputeTargetsTool,
  searchComputeTargetsTool,
  getAppEventTool,
  listAppEventsTool,
  searchAppEventsTool,
];

export function claudeAgentToolParamsForRole({
  role,
  executionMode = "interactive",
}: {
  role: ClaudeAgentRole;
  executionMode?: ClaudeAgentExecutionMode;
}): BetaManagedAgentsCustomToolParams[] {
  return claudeAgentToolDefinitions
    .filter((definition) => toolIsVisibleForRole({ definition, role, executionMode }))
    .map((definition) => ({
      type: definition.type,
      name: definition.name,
      description: definition.description,
      input_schema: definition.input_schema,
    }));
}

function toolIsVisibleForRole({
  definition,
  role,
  executionMode,
}: {
  definition: ClaudeAgentToolDefinition;
  role: ClaudeAgentRole;
  executionMode: ClaudeAgentExecutionMode;
}): boolean {
  if (!definition.roles.includes(role)) {
    return false;
  }
  if (
    role === "manager" &&
    executionMode === "headless" &&
    definition.name === "ask_user_question"
  ) {
    return false;
  }
  return true;
}

export function claudeAgentToolDefinitionByName({
  name,
}: {
  name: string;
}): ClaudeAgentToolDefinition | undefined {
  return claudeAgentToolDefinitions.find((definition) => definition.name === name);
}

export function claudeAgentToolDefinitionForRole({
  name,
  role,
}: {
  name: string;
  role: ClaudeAgentRole;
}): ClaudeAgentToolDefinition | undefined {
  const definition = claudeAgentToolDefinitionByName({ name });
  if (!definition?.roles.includes(role)) {
    return undefined;
  }
  return definition;
}
