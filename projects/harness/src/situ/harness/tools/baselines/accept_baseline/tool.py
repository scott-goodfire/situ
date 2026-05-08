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
from .models import AcceptBaselineResult


class AcceptBaselineTool(BaseSituTool[SituToolDeps, AcceptBaselineResult]):
    name = "accept_baseline"
    result_type = AcceptBaselineResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> AcceptBaselineResult:
        """Accept a triaged baseline (triage -> accepted).

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
        if baseline.status != RecordStatus.TRIAGE:
            return self._failure(
                code="invalid_status_transition",
                message=f"accept_baseline requires status 'triage', got '{baseline.status.value}'.",
            )
        updated = await repos.baselines.update(baseline_id=baseline_id, status=RecordStatus.ACCEPTED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update baseline: {baseline_id}")
        await repos.baseline_activities.add(
            baseline_id=baseline_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from triage to accepted.",
            payload={"from_status": "triage", "to_status": "accepted"},
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
            event_type="baseline.accepted",
            message=f"Accepted baseline {baseline_id}",
            payload={"baseline_id": baseline_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return AcceptBaselineResult(success=True, baseline=updated.model_dump())
