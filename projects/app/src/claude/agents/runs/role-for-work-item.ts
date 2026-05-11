import type { WorkItem } from "../../../runtime/work-items/types";
import {
  CLAUDE_MANAGER_RESEARCH_PROJECT_WORK_ITEM_PURPOSE,
  CLAUDE_SCIENTIST_RESEARCH_TASK_WORK_ITEM_PURPOSE,
  CLAUDE_VERIFIER_RESEARCH_TASK_WORK_ITEM_PURPOSE,
} from "../../../runtime/work-items/types";
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
  return "manager";
}
