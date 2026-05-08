from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import SubmitEvaluationResult


class SubmitEvaluationTool(BaseSituTool[SituToolDeps, SubmitEvaluationResult]):
    name = "submit_evaluation"
    result_type = SubmitEvaluationResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> SubmitEvaluationResult:
        """Submit a finished evaluation for Critic review (active -> in_review).

        Records a `status_updated` activity and optionally a `comment`.
        """
        repos = await ctx.deps.get_repos()
        evaluation = await repos.evaluations.get(evaluation_id=evaluation_id)
        if evaluation is None:
            return self._failure(code="evaluation_not_found", message=f"evaluation not found: {evaluation_id}")
        if evaluation.status != RecordStatus.ACTIVE:
            return self._failure(
                code="invalid_status_transition",
                message=f"submit_evaluation requires status 'active', got '{evaluation.status.value}'.",
            )
        updated = await repos.evaluations.update(evaluation_id=evaluation_id, status=RecordStatus.IN_REVIEW)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update evaluation: {evaluation_id}")
        await repos.evaluation_activities.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from active to in_review.",
            payload={"from_status": "active", "to_status": "in_review"},
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
            event_type="evaluation.in_review",
            message=f"Submitted evaluation {evaluation_id} for review",
            payload={"evaluation_id": evaluation_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return SubmitEvaluationResult(success=True, evaluation=updated.model_dump())
