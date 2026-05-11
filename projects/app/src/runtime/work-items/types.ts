import { z } from "zod";

import type { WorkItem } from "../../data/db/schema";

export const CLAUDE_AGENT_TURN_WORK_ITEM_PURPOSE = "claude.agent_turn";
export const CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE = "claude.manager_research_project";
export const CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE = "claude.scientist_research_task";
export const CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE = "claude.verifier_research_task";
export const CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE = "claude.scribe_session";
export const CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE = "claude.reporter_session";

export type WorkItemHandler = (args: { workItem: WorkItem }) => Promise<void>;

export const workItemPayloadSchema = z
  .object({
    content: z.string().optional(),
    claudeAgentRunId: z.string().optional(),
    researchProjectId: z.string().optional(),
    researchProjectPhase: z.string().optional(),
    activeResearchTaskId: z.string().optional(),
    computeTargetId: z.string().optional(),
    lastError: z.string().optional(),
    reportOutputDir: z.string().optional(),
    modelOverride: z.string().optional(),
  })
  .loose();

export type WorkItemPayload = z.infer<typeof workItemPayloadSchema>;

export type { WorkItem };
