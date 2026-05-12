import type { WorkItem } from "@situ/work-items";
import {
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "../../../runtime/work-items/purposes";
import type { ClaudeAgentRole } from "../roles";

export function roleForWorkItem({ workItem }: { workItem: WorkItem }): ClaudeAgentRole {
  if (workItem.purpose === CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE) {
    return "verifier";
  }
  if (workItem.purpose === CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE) {
    return "scientist";
  }
  if (workItem.purpose === CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE) {
    return "manager";
  }
  if (workItem.purpose === CLAUDE_SCRIBE_SESSION_WORK_ITEM_PURPOSE) {
    return "scribe";
  }
  if (workItem.purpose === CLAUDE_REPORTER_SESSION_WORK_ITEM_PURPOSE) {
    return "reporter";
  }
  return "manager";
}
