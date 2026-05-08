from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskPriority, TaskSourceKind, TaskStatus
from ...common import BaseSituTool, SituToolDeps
from .models import UpdateTaskResult


class UpdateTaskTool(BaseSituTool[SituToolDeps, UpdateTaskResult]):
    name = "update_task"
    result_type = UpdateTaskResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        title: str | None = None,
        content: str | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        source_kind: TaskSourceKind | None = None,
        payload: dict[str, Any] | None = None,
        pydantic_run_id: str | None = None,
        conversation_id: str | None = None,
        result_summary: str | None = None,
        **_kwargs: Any,
    ) -> UpdateTaskResult:
        """Update task coordination fields and lifecycle status.

        Call this when the assigned task is finished, blocked, or being
        repointed. Status transitions: `done` for successful completion (pass
        `result_summary`), `failed` when the work was attempted but blocked by
        an error or missing evidence, `abandoned` for graceful stop when the
        work is no longer worth pursuing. The `payload` argument replaces the
        full payload dict — read the task first if you only want to merge.
        """
        task = await (await ctx.deps.get_repos()).tasks.update(
            task_id=task_id,
            title=title,
            content=content,
            status=status,
            priority=priority,
            source_kind=source_kind,
            payload=payload,
            pydantic_run_id=pydantic_run_id,
            conversation_id=conversation_id,
            result_summary=result_summary,
            completed_in_session_id=ctx.deps.session_id if status is not None else None,
        )
        if task is None:
            raise ValueError(f"task not found: {task_id}")
        event_type = f"task.{task.status.value}" if status is not None else "task.updated"
        event = await ctx.deps.record_event(
            event_type=event_type,
            message=f"Updated task {task.id}",
            payload={"task_id": task.id, "status": task.status.value},
        )
        await ctx.deps.publish_record(record=task, event=event)
        return UpdateTaskResult(success=True, task=task.model_dump())
