from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskEntityKind
from ...common import BaseSituTool, SituToolDeps
from ..entity_targets import task_entity_target_exists
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
        """Link a task to a record it produced, referenced, or addressed.

        Use a short verb for `relationship` so the link reads as a sentence:
        `created` for records the task produced, `addresses` for a reviewed
        record or review activity a follow-up task responds to, `revises` or
        `reproduces` for repair tasks targeting a prior record, `considers` for
        evidence the task referenced. The target must already exist in the
        task's project. Pass an
        activity id (as a string) when linking to an activity, e.g.
        `entity_kind=hypothesis_activity, entity_id=str(activity.id)`.
        """
        repos = await ctx.deps.get_repos()
        checked_kind = TaskEntityKind(entity_kind)
        task = await repos.tasks.get(task_id=task_id)
        if task is None:
            raise ValueError(f"task not found: {task_id}")
        try:
            exists = await task_entity_target_exists(
                repos=repos,
                project_id=task.project_id,
                entity_kind=checked_kind,
                entity_id=entity_id,
            )
        except ValueError:
            exists = False
        if not exists:
            return self._failure(
                code="entity_target_not_found",
                message=(
                    f"{checked_kind.value} target not found in task project: "
                    f"{entity_id}"
                ),
            )
        link = await repos.task_entity_links.create(
            project_id=task.project_id,
            task_id=task_id,
            entity_kind=checked_kind,
            entity_id=entity_id,
            relationship=relationship,
        )
        event = await ctx.deps.record_event(
            event_type="task.entity_linked",
            message=f"Linked task {task_id} to {checked_kind.value}:{entity_id}",
            payload=link.model_dump(),
        )
        await ctx.deps.publish_record(record=link, event=event)
        return LinkTaskEntityResult(success=True, link=link.model_dump())
