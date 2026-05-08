import { TaskDetailView } from "@situ/web-app-ui";
import {
  dependenciesBlockedByTask,
  dependenciesBlockingTask,
  entityLinksForTask,
  taskActivitiesForTask,
} from "../../../selectors/tasks";
import type { ProjectWorkspaceData } from "../types";
import { activityItem, projectRouteParams, recordLink } from "../view-adapters";

export function TaskDetailPage({
  data,
  taskId,
}: {
  data: ProjectWorkspaceData;
  taskId: string;
}) {
  const task = data.tasks.find((record) => record.id === taskId);
  const params = projectRouteParams({ data });
  const taskLink = (targetId: string) => {
    const targetTask = data.tasks.find((record) => record.id === targetId);
    return recordLink({
      to: "/workspaces/$workspaceId/projects/$projectId/tasks/$taskId",
      params: { ...params, taskId: targetId },
      children: targetTask?.title ?? targetId,
    });
  };

  return (
    <TaskDetailView
      task={task}
      assignee={
        task?.assignee_id
          ? data.agents.find((agent) => agent.id === task.assignee_id)?.display_name ?? task.assignee_id
          : undefined
      }
      blockedBy={dependenciesBlockingTask({ data, taskId }).map((dep) => taskLink(dep.blocked_by_task_id))}
      blocks={dependenciesBlockedByTask({ data, taskId }).map((dep) => taskLink(dep.task_id))}
      links={entityLinksForTask({ data, taskId }).map((link) => ({
        id: `${link.entity_kind}:${link.entity_id}:${link.relationship}`,
        relationship: link.relationship,
        target: `${link.entity_kind} / ${link.entity_id}`,
      }))}
      activities={taskActivitiesForTask({ data, taskId }).map((activity) =>
        activityItem({
          prefix: "task-activity",
          id: activity.id,
          actor: activity.actor,
          body: activity.body,
          kind: activity.kind,
          payload: activity.payload,
          createdAt: activity.created_at,
        }),
      )}
    />
  );
}
