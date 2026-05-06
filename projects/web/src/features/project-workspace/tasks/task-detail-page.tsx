import type { TaskDependencyRecord, TaskEntityLinkRecord, TaskRecord } from "@situ/protocol";
import { DxBadge, DxEmptyState, DxSection } from "@situ/web-ui";
import { Link } from "@tanstack/react-router";
import {
  dependenciesBlockedByTask,
  dependenciesBlockingTask,
  entityLinksForTask,
  taskActivitiesForTask,
} from "../../../selectors/tasks";
import * as s from "../../../styles.css";
import { ActivityTimeline } from "../__shared__/activity-timeline";
import type { ActivityItem, ProjectWorkspaceData } from "../types";

export function TaskDetailPage({
  data,
  taskId,
}: {
  data: ProjectWorkspaceData;
  taskId: string;
}) {
  const task = data.tasks.find((record) => record.id === taskId);

  if (!task) {
    return (
      <DxEmptyState
        heading="Task not found"
        description={`No task exists with id ${taskId}.`}
      />
    );
  }

  const blockedBy = dependenciesBlockingTask({ data, taskId });
  const blocks = dependenciesBlockedByTask({ data, taskId });
  const links = entityLinksForTask({ data, taskId });
  const activities = taskActivitiesForTask({ data, taskId }).map(
    (activity): ActivityItem => ({
      id: `task-activity-${activity.id}`,
      actor: activity.actor,
      body: activity.body,
      kind: activity.payload?.activity_type
        ? String(activity.payload.activity_type)
        : activity.kind,
      createdAt: activity.created_at,
    }),
  );
  const assignee = task.assignee_id
    ? data.agents.find((agent) => agent.id === task.assignee_id)
    : null;

  return (
    <>
      <section className={s.objectPage}>
        <div className={s.objectPageHeader}>
          <div>
            <p className={s.objectPageEyebrow}>{task.kind} · {task.id}</p>
            <h2>{task.title}</h2>
          </div>
          <DxBadge>{task.status.replace(/_/g, " ")}</DxBadge>
        </div>
        {task.content && <p className={s.objectPageSummary}>{task.content}</p>}
        <div className={s.objectPageBadgeRow}>
          <DxBadge>{task.priority}</DxBadge>
          <DxBadge>{task.source_kind}</DxBadge>
          {assignee && <DxBadge>assignee: {assignee.display_name}</DxBadge>}
        </div>
      </section>

      {(blockedBy.length > 0 || blocks.length > 0) && (
        <DxSection title="Dependencies">
          {blockedBy.length > 0 && (
            <DependencyList
              label="Blocked by"
              dependencies={blockedBy}
              tasks={data.tasks}
              projectId={data.projectId}
              keyOf={(dep) => dep.blocked_by_task_id}
            />
          )}
          {blocks.length > 0 && (
            <DependencyList
              label="Blocks"
              dependencies={blocks}
              tasks={data.tasks}
              projectId={data.projectId}
              keyOf={(dep) => dep.task_id}
            />
          )}
        </DxSection>
      )}

      {links.length > 0 && (
        <DxSection title="Linked entities">
          {links.map((link) => (
            <EntityLinkRow key={`${link.entity_kind}:${link.entity_id}:${link.relationship}`} link={link} />
          ))}
        </DxSection>
      )}

      <ActivityTimeline
        title="Activity"
        activities={activities}
        emptyLabel="No task activity yet"
      />
    </>
  );
}

function DependencyList({
  label,
  dependencies,
  tasks,
  projectId,
  keyOf,
}: {
  label: string;
  dependencies: TaskDependencyRecord[];
  tasks: TaskRecord[];
  projectId: string;
  keyOf: (dep: TaskDependencyRecord) => string;
}) {
  return (
    <div className={s.dependencyList}>
      <strong>{label}</strong>
      {dependencies.map((dep) => {
        const targetId = keyOf(dep);
        const targetTask = tasks.find((task) => task.id === targetId);
        return (
          <Link
            key={`${dep.task_id}:${dep.blocked_by_task_id}`}
            className={s.recordLink}
            to="/projects/$projectId/tasks/$taskId"
            params={{ projectId, taskId: targetId }}
          >
            {targetTask?.title ?? targetId}
          </Link>
        );
      })}
    </div>
  );
}

function EntityLinkRow({ link }: { link: TaskEntityLinkRecord }) {
  return (
    <div className={s.recordCell}>
      <span>{link.relationship}</span>
      <span className={s.recordId}>{link.entity_kind} · {link.entity_id}</span>
    </div>
  );
}
