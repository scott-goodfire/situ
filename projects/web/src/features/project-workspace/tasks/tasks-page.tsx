import { TasksPageView } from "@situ/web-app-ui";
import { tasksForProject } from "../../../selectors/tasks";
import type { ProjectWorkspaceData } from "../types";
import { projectRouteParams, recordLink } from "../view-adapters";

export function TasksPage({ data }: { data: ProjectWorkspaceData }) {
  const params = projectRouteParams({ data });

  return (
    <TasksPageView
      rows={tasksForProject({ data }).map((task) => ({
        task,
        title: recordLink({
          to: "/workspaces/$workspaceId/projects/$projectId/tasks/$taskId",
          params: { ...params, taskId: task.id },
          children: task.title,
        }),
        assignee: task.assignee_id
          ? data.agents.find((agent) => agent.id === task.assignee_id)?.display_name ?? task.assignee_id
          : "-",
      }))}
    />
  );
}
