from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import AddTaskCommentResult


class AddTaskCommentTool(BaseSituTool[SituToolDeps, AddTaskCommentResult]):
    name = "add_task_comment"
    result_type = AddTaskCommentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        comment: str,
        actor: str = "agent",
        actor_agent_id: str | None = None,
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddTaskCommentResult:
        """Add a human-readable task activity comment."""
        activity = ctx.deps.get_repos().task_activities.add(
            task_id=task_id,
            actor_agent_id=actor_agent_id or ctx.deps.agent_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = ctx.deps.record_event(
            "task.comment_added",
            comment,
            payload={"activity_id": activity.id, "task_id": task_id},
        )
        ctx.deps.publish_record(activity, event=event)
        return AddTaskCommentResult(success=True, activity=activity.model_dump())
