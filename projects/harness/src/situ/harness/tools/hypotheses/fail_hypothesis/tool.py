from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import FailHypothesisResult


class FailHypothesisTool(BaseSituTool[SituToolDeps, FailHypothesisResult]):
    name = "fail_hypothesis"
    result_type = FailHypothesisResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> FailHypothesisResult:
        """Mark an active hypothesis as failed (active -> failed).

        Records a `status_updated` activity and optionally a `comment`.
        """
        repos = await ctx.deps.get_repos()
        hypothesis = await repos.hypotheses.get(hypothesis_id=hypothesis_id)
        if hypothesis is None:
            return self._failure(code="hypothesis_not_found", message=f"hypothesis not found: {hypothesis_id}")
        if hypothesis.status != RecordStatus.ACTIVE:
            return self._failure(
                code="invalid_status_transition",
                message=f"fail_hypothesis requires status 'active', got '{hypothesis.status.value}'.",
            )
        updated = await repos.hypotheses.update(hypothesis_id=hypothesis_id, status=RecordStatus.FAILED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update hypothesis: {hypothesis_id}")
        await repos.hypothesis_activities.add(
            hypothesis_id=hypothesis_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from active to failed.",
            payload={"from_status": "active", "to_status": "failed"},
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
            event_type="hypothesis.failed",
            message=f"Failed hypothesis {hypothesis_id}",
            payload={"hypothesis_id": hypothesis_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return FailHypothesisResult(success=True, hypothesis=updated.model_dump())
