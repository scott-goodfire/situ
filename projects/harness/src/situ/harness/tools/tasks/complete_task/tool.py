from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import TaskStatus
from ...common import BaseSituTool, SituToolDeps
from .models import CompleteTaskResult


class CompleteTaskTool(BaseSituTool[SituToolDeps, CompleteTaskResult]):
    name = "complete_task"
    result_type = CompleteTaskResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        task_id: str,
        result_summary: str | None = None,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CompleteTaskResult:
        """Mark an in-progress task as done (in_progress -> done).

        Records a `status_updated` activity and optionally a `comment`.
        Pass `result_summary` for the task completion summary.

        The `result_summary` field is voice-bearing prose written in
        complete sentences with first-person where natural. Reads like a
        PR description's "What changed" section: names what was produced
        and cites the records or follow-up tasks created. Basic Markdown works
        in `result_summary`; use emphasis, inline code, bullets, or a small
        table when that makes the result easier to scan.

        <example field="result_summary">
        I'm marking this task done. EX5 is supported by three
        measurements (M14, M15, M17), all consistent with each other. I
        left a comment noting that EX5 is ready for Critic review, and I
        filed a follow-up experiment task (T23) for the A+C combination
        so we can pick that up once the review on EX5 lands.
        </example>

        <example field="result_summary">
        I'm marking this task done, but I want to flag something for the
        next pass. The baseline is established (M1, M2, M3), but the
        variance between runs is wider than I expected at ±0.008. I
        think it's worth a Researcher task to look at whether our eval
        set has enough samples to support the comparisons we want to
        make on top of it. I left that note in T8's comments so we
        don't lose track.
        </example>

        <example field="result_summary">
        Done. I ran the cold-start reproducer 3x on M22, M23, M24. The
        +0.04 lift reproduced on all three with mean +0.038 (±0.002),
        and the wall-clock cost stayed in line with M22's original
        measurement. I left a comment on EX9 that it's ready for Critic
        review.
        </example>
        """
        repos = await ctx.deps.get_repos()
        task = await repos.tasks.get(task_id=task_id)
        if task is None:
            return self._failure(code="task_not_found", message=f"task not found: {task_id}")
        if task.status != TaskStatus.IN_PROGRESS:
            return self._failure(
                code="invalid_status_transition",
                message=f"complete_task requires status 'in_progress', got '{task.status.value}'.",
            )
        updated = await repos.tasks.update(
            task_id=task_id,
            status=TaskStatus.DONE,
            result_summary=result_summary,
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
            body="Status changed from in_progress to done.",
            payload={"from_status": "in_progress", "to_status": "done"},
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
            event_type="task.done",
            message=f"Completed task {task_id}",
            payload={"task_id": task_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return CompleteTaskResult(success=True, task=updated.model_dump())
