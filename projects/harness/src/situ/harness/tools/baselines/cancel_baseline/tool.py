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
from .models import CancelBaselineResult

_TERMINAL = {RecordStatus.DONE, RecordStatus.CANCELED, RecordStatus.FAILED}


class CancelBaselineTool(BaseSituTool[SituToolDeps, CancelBaselineResult]):
    name = "cancel_baseline"
    result_type = CancelBaselineResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CancelBaselineResult:
        """Cancel a non-terminal baseline (any non-terminal -> canceled).

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
        if baseline.status in _TERMINAL:
            return self._failure(
                code="invalid_status_transition",
                message=f"cancel_baseline cannot cancel a baseline already in terminal status '{baseline.status.value}'.",
            )
        from_status = baseline.status.value
        updated = await repos.baselines.update(baseline_id=baseline_id, status=RecordStatus.CANCELED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update baseline: {baseline_id}")
        await repos.baseline_activities.add(
            baseline_id=baseline_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=f"Status changed from {from_status} to canceled.",
            payload={"from_status": from_status, "to_status": "canceled"},
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
            event_type="baseline.canceled",
            message=f"Canceled baseline {baseline_id}",
            payload={"baseline_id": baseline_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return CancelBaselineResult(success=True, baseline=updated.model_dump())
