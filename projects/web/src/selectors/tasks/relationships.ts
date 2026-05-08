import type {
  TaskDependencyRecord,
  TaskEntityLinkRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function dependenciesBlockingTask({
  data,
  taskId,
}: {
  data: ProjectWorkspaceData;
  taskId: string;
}): TaskDependencyRecord[] {
  return filter(data.taskDependencies, (dep) => dep.task_id === taskId);
}

export function dependenciesBlockedByTask({
  data,
  taskId,
}: {
  data: ProjectWorkspaceData;
  taskId: string;
}): TaskDependencyRecord[] {
  return filter(
    data.taskDependencies,
    (dep) => dep.blocked_by_task_id === taskId,
  );
}

export function entityLinksForTask({
  data,
  taskId,
}: {
  data: ProjectWorkspaceData;
  taskId: string;
}): TaskEntityLinkRecord[] {
  return filter(data.taskEntityLinks, (link) => link.task_id === taskId);
}
