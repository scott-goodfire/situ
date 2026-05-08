from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskStatus
from ...common import BaseSituTool, SituToolDeps
from .models import AcceptTaskResult


class AcceptTaskTool(BaseSituTool[SituToolDeps, AcceptTaskResult]):
    name = "accept_task"
    result_type = AcceptTaskResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> AcceptTaskResult:
        """Accept a triaged task into the backlog (triage -> backlog).

        Moves the task from `triage` to `backlog`, records a `status_updated`
        activity, and optionally records a `comment` activity.
        """
        repos = await ctx.deps.get_repos()
        task = await repos.tasks.get(task_id=task_id)
        if task is None:
            return self._failure(code="task_not_found", message=f"task not found: {task_id}")
        if task.status != TaskStatus.TRIAGE:
            return self._failure(
                code="invalid_status_transition",
                message=f"accept_task requires status 'triage', got '{task.status.value}'.",
            )
        updated = await repos.tasks.update(task_id=task_id, status=TaskStatus.BACKLOG)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update task: {task_id}")
        await repos.task_activities.add(
            project_id=updated.project_id,
            task_id=task_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=f"Status changed from triage to backlog.",
            payload={"from_status": "triage", "to_status": "backlog"},
        )
        if comment:
            await repos.task_activities.add(
                project_id=updated.project_id,
                task_id=task_id,
                created_in_session_id=ctx.deps.session_id,
                actor="agent",
                kind="comment",
                body=comment,
            )
        event = await ctx.deps.record_event(
            event_type="task.accepted",
            message=f"Accepted task {task_id}",
            payload={"task_id": task_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return AcceptTaskResult(success=True, task=updated.model_dump())
