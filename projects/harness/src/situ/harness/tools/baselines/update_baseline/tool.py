from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import BaseSituTool, SituToolDeps
from .models import UpdateBaselineResult


class UpdateBaselineTool(BaseSituTool[SituToolDeps, UpdateBaselineResult]):
    name = "update_baseline"
    result_type = UpdateBaselineResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        baseline_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> UpdateBaselineResult:
        """Update simple baseline fields.

        `status` must be `open`, `active`, or `closed`. Put noisy,
        suspicious, or accepted-for-comparison details in measurements or
        comments instead.
        """
        baseline = ctx.deps.get_repos().baselines.update(
            baseline_id=baseline_id,
            title=title,
            summary=summary,
            status=status,
        )
        if baseline is None:
            raise ValueError(f"baseline not found: {baseline_id}")

        event = ctx.deps.record_event(
            "baseline.updated",
            f"Updated baseline {baseline.id}",
            payload={"baseline_id": baseline.id},
        )
        ctx.deps.publish_record(baseline, event=event)
        return UpdateBaselineResult(success=True, baseline=baseline.model_dump())
