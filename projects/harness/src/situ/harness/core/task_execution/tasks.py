from __future__ import annotations

from ...records import (
    TaskKind,
    TaskRecord,
)
from ...repositories import Repositories
from .events import publish_record, record_event

PLAN_TASK_TITLE = "Plan next step"


async def create_plan_task(
    repos: Repositories,
    *,
    session_id: str,
    project_id: str,
    title: str,
    content: str,
    source_kind: str = "system",
) -> TaskRecord:
    """Insert a fresh plan task. No reuse: every plan pass is its own row."""
    task = await repos.tasks.create(
        task_id=await repos.tasks.next_id(project_id=project_id),
        project_id=project_id,
        created_in_session_id=session_id,
        title=PLAN_TASK_TITLE,
        content=content,
        kind=TaskKind.PLAN,
        priority="high",
        source_kind=source_kind,
        payload={"trigger_title": title},
    )
    event = await record_event(
        repos,
        event_type="task.created",
        message=f"Created task {task.id}",
        session_id=session_id,
        project_id=project_id,
        payload={"task_id": task.id, "kind": task.kind.value},
    )
    activity = await repos.task_activities.add(
        project_id=project_id,
        task_id=task.id,
        created_in_session_id=session_id,
        actor="system",
        kind="comment",
        body=f"Queued planning pass: {title}.",
        payload={
            "activity_type": "planning_task_queued",
            "trigger_title": title,
        },
    )
    await publish_record(repos=repos, project_id=project_id, record=task, cursor=event.id)
    await publish_record(repos=repos, project_id=project_id, record=activity, cursor=event.id)
    return task


