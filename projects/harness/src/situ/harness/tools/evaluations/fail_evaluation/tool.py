from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import FailEvaluationResult

_FAILABLE = {RecordStatus.ACTIVE, RecordStatus.IN_REVIEW}


class FailEvaluationTool(BaseSituTool[SituToolDeps, FailEvaluationResult]):
    name = "fail_evaluation"
    result_type = FailEvaluationResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> FailEvaluationResult:
        """Mark an active or in-review evaluation as failed (active|in_review -> failed).

        Records a `status_updated` activity and optionally a `comment`.
        """
        repos = await ctx.deps.get_repos()
        evaluation = await repos.evaluations.get(evaluation_id=evaluation_id)
        if evaluation is None:
            return self._failure(code="evaluation_not_found", message=f"evaluation not found: {evaluation_id}")
        if evaluation.status not in _FAILABLE:
            return self._failure(
                code="invalid_status_transition",
                message=f"fail_evaluation requires status 'active' or 'in_review', got '{evaluation.status.value}'.",
            )
        from_status = evaluation.status.value
        updated = await repos.evaluations.update(evaluation_id=evaluation_id, status=RecordStatus.FAILED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update evaluation: {evaluation_id}")
        await repos.evaluation_activities.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=f"Status changed from {from_status} to failed.",
            payload={"from_status": from_status, "to_status": "failed"},
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
            event_type="evaluation.failed",
            message=f"Failed evaluation {evaluation_id}",
            payload={"evaluation_id": evaluation_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return FailEvaluationResult(success=True, evaluation=updated.model_dump())
