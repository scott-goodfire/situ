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
        repos = ctx.deps.get_repos()
        task = repos.tasks.get(task_id=task_id)
        if task is None:
            raise ValueError(f"task not found: {task_id}")
        activity = repos.task_activities.add(
            project_id=task.project_id,
            task_id=task_id,
            created_in_session_id=ctx.deps.session_id,
            actor_agent_id=actor_agent_id or ctx.deps.agent_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = ctx.deps.record_event(
            event_type="task.comment_added",
            message=comment,
            payload={"activity_id": activity.id, "task_id": task_id},
        )
        ctx.deps.publish_record(record=activity, event=event)
        return AddTaskCommentResult(success=True, activity=activity.model_dump())
