from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus, parse_record_status
from ...common import SituToolDeps, BaseSituTool
from .models import UpdateHypothesisResult


class UpdateHypothesisTool(BaseSituTool[SituToolDeps, UpdateHypothesisResult]):
    name = "update_hypothesis"
    result_type = UpdateHypothesisResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: RecordStatus | None = None,
        **_kwargs: Any,
    ) -> UpdateHypothesisResult:
        """Update simple hypothesis fields.

        Notes:
            Setting `status` to `done` is rejected. To close a hypothesis,
            use `resolve_hypothesis` so the activity trail records the
            resolution as supported, rejected, superseded, or
            inconclusive.
        """
        checked_status = None
        if status is not None:
            try:
                checked_status = parse_record_status(
                    status=status,
                    noun="hypothesis",
                )
            except ValueError as error:
                return self._failure(
                    code="invalid_hypothesis_status",
                    message=str(error),
                )
            if checked_status == RecordStatus.DONE:
                return self._failure(
                    code="hypothesis_resolution_required",
                    message=(
                        "Use resolve_hypothesis to close a hypothesis so the "
                        "activity trail records supported, rejected, "
                        "superseded, or inconclusive."
                    ),
                )
        hypothesis = await (await ctx.deps.get_repos()).hypotheses.update(
            hypothesis_id=hypothesis_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        if hypothesis is None:
            raise ValueError(f"hypothesis not found: {hypothesis_id}")

        event = await ctx.deps.record_event(
            event_type="hypothesis.updated",
            message=f"Updated hypothesis {hypothesis.id}",
            payload={"hypothesis_id": hypothesis.id},
        )
        await ctx.deps.publish_record(record=hypothesis, event=event)
        return UpdateHypothesisResult(success=True, hypothesis=hypothesis.model_dump())
