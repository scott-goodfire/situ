from __future__ import annotations

from pydantic_ai import RunContext

from ...records import TaskEntityKind, TaskEntityLinkRecord
from .deps import SituToolDeps


async def link_active_task_entity(
    *,
    ctx: RunContext[SituToolDeps],
    entity_kind: TaskEntityKind,
    entity_id: str,
    relationship: str = "created",
) -> TaskEntityLinkRecord | None:
    """Link a newly created record to the active task when task context exists."""
    task_id = ctx.deps.active_task_id
    if task_id is None:
        return None

    repos = await ctx.deps.get_repos()
    project_id = await ctx.deps.require_project_id()
    task = await repos.tasks.get(task_id=task_id)
    if task is None or task.project_id != project_id:
        raise ValueError(f"active task not found in current project: {task_id}")

    link = await repos.task_entity_links.create(
        project_id=project_id,
        task_id=task.id,
        entity_kind=entity_kind,
        entity_id=entity_id,
        relationship=relationship,
    )
    event = await ctx.deps.record_event(
        event_type="task.entity_linked",
        message=f"Linked task {task.id} to {entity_kind.value}:{entity_id}",
        payload=link.model_dump(),
    )
    await ctx.deps.publish_record(record=link, event=event)
    return link
