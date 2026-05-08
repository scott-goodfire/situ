from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .._evaluations import submit_active_baseline_evaluations
from .models import SubmitBaselineResult


class SubmitBaselineTool(BaseSituTool[SituToolDeps, SubmitBaselineResult]):
    name = "submit_baseline"
    result_type = SubmitBaselineResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> SubmitBaselineResult:
        """Submit a finished baseline for Critic review (active -> in_review).

        Records a `status_updated` activity and optionally a `comment`.
        """
        repos = await ctx.deps.get_repos()
        baseline = await repos.baselines.get(baseline_id=baseline_id)
        if baseline is None:
            return self._failure(code="baseline_not_found", message=f"baseline not found: {baseline_id}")
        if baseline.status != RecordStatus.ACTIVE:
            return self._failure(
                code="invalid_status_transition",
                message=f"submit_baseline requires status 'active', got '{baseline.status.value}'.",
            )
        updated = await repos.baselines.update(baseline_id=baseline_id, status=RecordStatus.IN_REVIEW)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update baseline: {baseline_id}")
        await repos.baseline_activities.add(
            baseline_id=baseline_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from active to in_review.",
            payload={"from_status": "active", "to_status": "in_review"},
        )
        if comment:
            await repos.baseline_activities.add(
                baseline_id=baseline_id,
                created_in_session_id=ctx.deps.session_id,
                actor="agent",
                kind="comment",
                body=comment,
            )
        event = await ctx.deps.record_event(
            event_type="baseline.in_review",
            message=f"Submitted baseline {baseline_id} for review",
            payload={"baseline_id": baseline_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        await submit_active_baseline_evaluations(ctx=ctx, baseline_id=baseline_id)
        return SubmitBaselineResult(success=True, baseline=updated.model_dump())
