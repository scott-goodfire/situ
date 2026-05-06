import type {
  TaskActivityRecord,
  TaskRecord,
} from "@situ/protocol";
import filter from "lodash/filter";
import type { ProjectWorkspaceData } from "../../features/project-workspace/types";

export function tasksForProject({
  data,
}: {
  data: ProjectWorkspaceData;
}): TaskRecord[] {
  return filter(data.tasks, (task) => task.project_id === data.projectId);
}

export function taskActivitiesForTask({
  data,
  taskId,
}: {
  data: ProjectWorkspaceData;
  taskId: string;
}): TaskActivityRecord[] {
  return filter(data.taskActivities, (activity) => activity.task_id === taskId);
}
