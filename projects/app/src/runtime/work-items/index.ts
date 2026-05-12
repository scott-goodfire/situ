// Re-export queue mechanics from the package for stable in-app import paths,
// alongside the app-side handler composition + Claude-specific purpose
// constants.
export {
  workItemModule,
  workItemRepository,
  workItemPayloadSchema,
  type WorkItem,
  type WorkItemHandler,
  type WorkItemPayload,
} from "@situ/work-items";

export { handleClaimedWorkItem, workItemLeaseMs, workItemMaxAttempts } from "./handlers";
export {
  CLAUDE_AGENT_TURN_WORK_ITEM_PURPOSE,
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "./purposes";
