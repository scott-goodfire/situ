from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import UpdateBaselineResult


class UpdateBaselineTool(BaseSituTool[SituToolDeps, UpdateBaselineResult]):
    name = "update_baseline"
    result_type = UpdateBaselineResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: RecordStatus | None = None,
        **_kwargs: Any,
    ) -> UpdateBaselineResult:
        """Update simple baseline fields.

        Put noisy, suspicious, or accepted-for-comparison details in
        measurements or comments instead.

        Notes:
            Use the dedicated transition tools for status changes rather
            than this update: `accept_baseline` (triage -> accepted),
            `submit_baseline` (active -> in_review), `complete_baseline`
            (in_review -> done), `cancel_baseline`, or `fail_baseline`.
            Each transition tool records a `status_updated` activity and
            accepts an optional verdict comment.
        """
        baseline = await (await ctx.deps.get_repos()).baselines.update(
            baseline_id=baseline_id,
            title=title,
            summary=summary,
            status=status,
        )
        if baseline is None:
            raise ValueError(f"baseline not found: {baseline_id}")

        event = await ctx.deps.record_event(
            event_type="baseline.updated",
            message=f"Updated baseline {baseline.id}",
            payload={"baseline_id": baseline.id},
        )
        await ctx.deps.publish_record(record=baseline, event=event)
        return UpdateBaselineResult(success=True, baseline=baseline.model_dump())
