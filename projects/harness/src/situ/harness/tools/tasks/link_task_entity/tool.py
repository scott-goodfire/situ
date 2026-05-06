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

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        entity_kind: TaskEntityKind,
        entity_id: str,
        relationship: str = "created",
        **_kwargs: Any,
    ) -> LinkTaskEntityResult:
        """Link a task to a produced or referenced ledger entity."""
        link = ctx.deps.get_repos().task_entity_links.create(
            task_id=task_id,
            entity_kind=entity_kind,
            entity_id=entity_id,
            relationship=relationship,
        )
        event = ctx.deps.record_event(
            "task.entity_linked",
            f"Linked task {task_id} to {entity_kind}:{entity_id}",
            payload=link.model_dump(),
        )
        ctx.deps.publish_record(link, event=event)
        return LinkTaskEntityResult(success=True, link=link.model_dump())
