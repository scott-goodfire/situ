from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import (
    BaseSituTool,
    ReviewTargetKind,
    SituToolDeps,
    ensure_active_review_target,
)
from .models import CompleteEvaluationResult


class CompleteEvaluationTool(BaseSituTool[SituToolDeps, CompleteEvaluationResult]):
    name = "complete_evaluation"
    result_type = CompleteEvaluationResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CompleteEvaluationResult:
        """Mark an in-review evaluation as done (in_review -> done).

        Records a `status_updated` activity and optionally a `comment`.
        """
        ensure_active_review_target(
            ctx=ctx,
            kind=ReviewTargetKind.EVALUATION,
            record_id=evaluation_id,
        )
        repos = await ctx.deps.get_repos()
        evaluation = await repos.evaluations.get(evaluation_id=evaluation_id)
        if evaluation is None:
            return self._failure(code="evaluation_not_found", message=f"evaluation not found: {evaluation_id}")
        if evaluation.status != RecordStatus.IN_REVIEW:
            return self._failure(
                code="invalid_status_transition",
                message=f"complete_evaluation requires status 'in_review', got '{evaluation.status.value}'.",
            )
        updated = await repos.evaluations.update(evaluation_id=evaluation_id, status=RecordStatus.DONE)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update evaluation: {evaluation_id}")
        await repos.evaluation_activities.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from in_review to done.",
            payload={"from_status": "in_review", "to_status": "done"},
        )
        if comment:
            await repos.evaluation_activities.add(
                evaluation_id=evaluation_id,
                created_in_session_id=ctx.deps.session_id,
                actor="agent",
                kind="comment",
                body=comment,
            )
        event = await ctx.deps.record_event(
            event_type="evaluation.done",
            message=f"Completed evaluation {evaluation_id}",
            payload={"evaluation_id": evaluation_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return CompleteEvaluationResult(success=True, evaluation=updated.model_dump())
