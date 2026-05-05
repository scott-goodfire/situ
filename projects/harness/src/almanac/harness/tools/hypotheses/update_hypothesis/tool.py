from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

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
        status: str | None = None,
        **_kwargs: Any,
    ) -> UpdateHypothesisResult:
        """Update simple hypothesis fields."""
        hypothesis = ctx.deps.repos.hypotheses.update(
            hypothesis_id,
            title=title,
            summary=summary,
            status=status,
        )
        if hypothesis is None:
            raise ValueError(f"hypothesis not found: {hypothesis_id}")

        ctx.deps.record_event(
            "hypothesis.updated",
            f"Updated hypothesis {hypothesis.id}",
            payload={"hypothesis_id": hypothesis.id},
        )
        return UpdateHypothesisResult(success=True, hypothesis=hypothesis.model_dump())
