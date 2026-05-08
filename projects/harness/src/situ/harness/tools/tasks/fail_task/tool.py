from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskStatus
from ...common import BaseSituTool, SituToolDeps
from .models import FailTaskResult


class FailTaskTool(BaseSituTool[SituToolDeps, FailTaskResult]):
    name = "fail_task"
    result_type = FailTaskResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> FailTaskResult:
        """Fail an in-progress task (in_progress -> failed).

        Use when the task was attempted but blocked by an error, missing
        evidence, or unusable execution result. Records a `status_updated`
        activity and optionally a `comment` with the failure reason.
        """
        repos = await ctx.deps.get_repos()
        task = await repos.tasks.get(task_id=task_id)
        if task is None:
            return self._failure(code="task_not_found", message=f"task not found: {task_id}")
        if task.status != TaskStatus.IN_PROGRESS:
            return self._failure(
                code="invalid_status_transition",
                message=f"fail_task requires status 'in_progress', got '{task.status.value}'.",
            )
        updated = await repos.tasks.update(
            task_id=task_id,
            status=TaskStatus.FAILED,
            completed_in_session_id=ctx.deps.session_id,
        )
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update task: {task_id}")
        await repos.task_activities.add(
            project_id=updated.project_id,
            task_id=task_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from in_progress to failed.",
            payload={"from_status": "in_progress", "to_status": "failed"},
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
            event_type="task.failed",
            message=f"Failed task {task_id}",
            payload={"task_id": task_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return FailTaskResult(success=True, task=updated.model_dump())
