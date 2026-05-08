from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import FailBaselineResult

_FAILABLE = {RecordStatus.ACTIVE, RecordStatus.IN_REVIEW}


class FailBaselineTool(BaseSituTool[SituToolDeps, FailBaselineResult]):
    name = "fail_baseline"
    result_type = FailBaselineResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> FailBaselineResult:
        """Mark an active or in-review baseline as failed (active|in_review -> failed).

        Records a `status_updated` activity and optionally a `comment`.
        """
        repos = await ctx.deps.get_repos()
        baseline = await repos.baselines.get(baseline_id=baseline_id)
        if baseline is None:
            return self._failure(code="baseline_not_found", message=f"baseline not found: {baseline_id}")
        if baseline.status not in _FAILABLE:
            return self._failure(
                code="invalid_status_transition",
                message=f"fail_baseline requires status 'active' or 'in_review', got '{baseline.status.value}'.",
            )
        from_status = baseline.status.value
        updated = await repos.baselines.update(baseline_id=baseline_id, status=RecordStatus.FAILED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update baseline: {baseline_id}")
        await repos.baseline_activities.add(
            baseline_id=baseline_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=f"Status changed from {from_status} to failed.",
            payload={"from_status": from_status, "to_status": "failed"},
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
            event_type="baseline.failed",
            message=f"Failed baseline {baseline_id}",
            payload={"baseline_id": baseline_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return FailBaselineResult(success=True, baseline=updated.model_dump())
