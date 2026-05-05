from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import UpdateHypothesisResult


class UpdateHypothesisTool(BaseAlmanacTool[AlmanacToolDeps, UpdateHypothesisResult]):
    name = "update_hypothesis"
    result_type = UpdateHypothesisResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        hypothesis_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> UpdateHypothesisResult:
        """Update simple hypothesis fields.

        `status` must be `open`, `active`, or `closed`. Put result details
        such as completed, failed, or suspicious in a hypothesis comment
        instead.
        """
        hypothesis = ctx.deps.get_repos().hypotheses.update(
            hypothesis_id=hypothesis_id,
            title=title,
            summary=summary,
            status=status,
        )
        if hypothesis is None:
            raise ValueError(f"hypothesis not found: {hypothesis_id}")

        event = ctx.deps.record_event(
            "hypothesis.updated",
            f"Updated hypothesis {hypothesis.id}",
            payload={"hypothesis_id": hypothesis.id},
        )
        ctx.deps.publish_record(hypothesis, event=event)
        return UpdateHypothesisResult(success=True, hypothesis=hypothesis.model_dump())
