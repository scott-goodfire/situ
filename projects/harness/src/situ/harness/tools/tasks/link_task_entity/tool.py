from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskEntityKind
from ...common import BaseSituTool, SituToolDeps
from .models import LinkTaskEntityResult


class LinkTaskEntityTool(BaseSituTool[SituToolDeps, LinkTaskEntityResult]):
    name = "link_task_entity"
    result_type = LinkTaskEntityResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        entity_kind: TaskEntityKind,
        entity_id: str,
        relationship: str = "created",
        **_kwargs: Any,
    ) -> LinkTaskEntityResult:
        """Link a task to a record it produced, referenced, reviewed, or addressed.

        Use a short verb for `relationship` so the link reads as a sentence:
        `created` for records the task produced, `reviews` for the target of a
        review task, `addresses` for the review activity a follow-up task
        responds to, `revises` or `reproduces` for repair tasks targeting a
        prior record, `considers` for evidence the task referenced. Pass an
        activity id (as a string) when linking to an activity, e.g.
        `entity_kind=hypothesis_activity, entity_id=str(activity.id)`.
        """
        repos = await ctx.deps.get_repos()
        task = await repos.tasks.get(task_id=task_id)
        if task is None:
            raise ValueError(f"task not found: {task_id}")
        link = await repos.task_entity_links.create(
            project_id=task.project_id,
            task_id=task_id,
            entity_kind=entity_kind,
            entity_id=entity_id,
            relationship=relationship,
        )
        event = await ctx.deps.record_event(
            event_type="task.entity_linked",
            message=f"Linked task {task_id} to {entity_kind}:{entity_id}",
            payload=link.model_dump(),
        )
        await ctx.deps.publish_record(record=link, event=event)
        return LinkTaskEntityResult(success=True, link=link.model_dump())
