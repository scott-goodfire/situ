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
from .models import AcceptEvaluationResult


class AcceptEvaluationTool(BaseSituTool[SituToolDeps, AcceptEvaluationResult]):
    name = "accept_evaluation"
    result_type = AcceptEvaluationResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> AcceptEvaluationResult:
        """Accept a triaged evaluation (triage -> accepted).

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
        if evaluation.status != RecordStatus.TRIAGE:
            return self._failure(
                code="invalid_status_transition",
                message=f"accept_evaluation requires status 'triage', got '{evaluation.status.value}'.",
            )
        updated = await repos.evaluations.update(evaluation_id=evaluation_id, status=RecordStatus.ACCEPTED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update evaluation: {evaluation_id}")
        await repos.evaluation_activities.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from triage to accepted.",
            payload={"from_status": "triage", "to_status": "accepted"},
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
            event_type="evaluation.accepted",
            message=f"Accepted evaluation {evaluation_id}",
            payload={"evaluation_id": evaluation_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return AcceptEvaluationResult(success=True, evaluation=updated.model_dump())
