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
from .models import AcceptHypothesisResult


class AcceptHypothesisTool(BaseSituTool[SituToolDeps, AcceptHypothesisResult]):
    name = "accept_hypothesis"
    result_type = AcceptHypothesisResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> AcceptHypothesisResult:
        """Accept a triaged hypothesis (triage -> accepted).

        Records a `status_updated` activity and optionally a `comment`.
        """
        ensure_active_review_target(
            ctx=ctx,
            kind=ReviewTargetKind.HYPOTHESIS,
            record_id=hypothesis_id,
        )
        repos = await ctx.deps.get_repos()
        hypothesis = await repos.hypotheses.get(hypothesis_id=hypothesis_id)
        if hypothesis is None:
            return self._failure(code="hypothesis_not_found", message=f"hypothesis not found: {hypothesis_id}")
        if hypothesis.status != RecordStatus.TRIAGE:
            return self._failure(
                code="invalid_status_transition",
                message=f"accept_hypothesis requires status 'triage', got '{hypothesis.status.value}'.",
            )
        updated = await repos.hypotheses.update(hypothesis_id=hypothesis_id, status=RecordStatus.ACCEPTED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update hypothesis: {hypothesis_id}")
        await repos.hypothesis_activities.add(
            hypothesis_id=hypothesis_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from triage to accepted.",
            payload={"from_status": "triage", "to_status": "accepted"},
        )
        if comment:
            await repos.hypothesis_activities.add(
                hypothesis_id=hypothesis_id,
                created_in_session_id=ctx.deps.session_id,
                actor="agent",
                kind="comment",
                body=comment,
            )
        event = await ctx.deps.record_event(
            event_type="hypothesis.accepted",
            message=f"Accepted hypothesis {hypothesis_id}",
            payload={"hypothesis_id": hypothesis_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return AcceptHypothesisResult(success=True, hypothesis=updated.model_dump())
