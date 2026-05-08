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
from .._evaluations import complete_open_baseline_evaluations
from .models import CompleteBaselineResult


class CompleteBaselineTool(BaseSituTool[SituToolDeps, CompleteBaselineResult]):
    name = "complete_baseline"
    result_type = CompleteBaselineResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CompleteBaselineResult:
        """Mark an in-review baseline as done (in_review -> done).

        Records a `status_updated` activity and optionally a `comment`.
        """
        ensure_active_review_target(
            ctx=ctx,
            kind=ReviewTargetKind.BASELINE,
            record_id=baseline_id,
        )
        repos = await ctx.deps.get_repos()
        baseline = await repos.baselines.get(baseline_id=baseline_id)
        if baseline is None:
            return self._failure(code="baseline_not_found", message=f"baseline not found: {baseline_id}")
        if baseline.status != RecordStatus.IN_REVIEW:
            return self._failure(
                code="invalid_status_transition",
                message=f"complete_baseline requires status 'in_review', got '{baseline.status.value}'.",
            )
        updated = await repos.baselines.update(baseline_id=baseline_id, status=RecordStatus.DONE)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update baseline: {baseline_id}")
        await repos.baseline_activities.add(
            baseline_id=baseline_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from in_review to done.",
            payload={"from_status": "in_review", "to_status": "done"},
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
            event_type="baseline.done",
            message=f"Completed baseline {baseline_id}",
            payload={"baseline_id": baseline_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        await complete_open_baseline_evaluations(ctx=ctx, baseline_id=baseline_id)
        return CompleteBaselineResult(success=True, baseline=updated.model_dump())
