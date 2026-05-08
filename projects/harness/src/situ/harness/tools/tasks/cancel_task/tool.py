from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskStatus
from ...common import BaseSituTool, SituToolDeps
from .models import CancelTaskResult

_TERMINAL = {TaskStatus.DONE, TaskStatus.CANCELED, TaskStatus.FAILED}


class CancelTaskTool(BaseSituTool[SituToolDeps, CancelTaskResult]):
    name = "cancel_task"
    result_type = CancelTaskResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CancelTaskResult:
        """Cancel a non-terminal task (any non-terminal -> canceled).

        Records a `status_updated` activity and optionally a `comment`.
        """
        repos = await ctx.deps.get_repos()
        task = await repos.tasks.get(task_id=task_id)
        if task is None:
            return self._failure(code="task_not_found", message=f"task not found: {task_id}")
        if task.status in _TERMINAL:
            return self._failure(
                code="invalid_status_transition",
                message=f"cancel_task cannot cancel a task already in terminal status '{task.status.value}'.",
            )
        from_status = task.status.value
        updated = await repos.tasks.update(task_id=task_id, status=TaskStatus.CANCELED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update task: {task_id}")
        await repos.task_activities.add(
            project_id=updated.project_id,
            task_id=task_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=f"Status changed from {from_status} to canceled.",
            payload={"from_status": from_status, "to_status": "canceled"},
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
            event_type="task.canceled",
            message=f"Canceled task {task_id}",
            payload={"task_id": task_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return CancelTaskResult(success=True, task=updated.model_dump())
