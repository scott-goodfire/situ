from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import SituToolDeps, BaseSituTool
from .models import UpdateEvaluationResult


class UpdateEvaluationTool(BaseSituTool[SituToolDeps, UpdateEvaluationResult]):
    name = "update_evaluation"
    result_type = UpdateEvaluationResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: RecordStatus | None = None,
        associated_baseline_id: str | None = None,
        associated_experiment_id: str | None = None,
        **_kwargs: Any,
    ) -> UpdateEvaluationResult:
        """Update simple evaluation fields.

        Setting `associated_baseline_id` switches the measured subject to
        that baseline; setting `associated_experiment_id` switches it to
        that experiment. Put raw evidence, failures, suspiciousness, and
        interpretations in measurements.

        Notes:
            Use the dedicated transition tools for status changes rather
            than this update: `accept_evaluation` (triage -> accepted),
            `submit_evaluation` (active -> in_review), `complete_evaluation`
            (in_review -> done), `cancel_evaluation`, or `fail_evaluation`.
            Each transition tool records a `status_updated` activity and
            accepts an optional verdict comment.
        """
        evaluation = await (await ctx.deps.get_repos()).evaluations.update(
            evaluation_id=evaluation_id,
            title=title,
            summary=summary,
            status=status,
            associated_baseline_id=associated_baseline_id,
            associated_experiment_id=associated_experiment_id,
        )
        if evaluation is None:
            raise ValueError(f"evaluation not found: {evaluation_id}")

        event = await ctx.deps.record_event(
            event_type="evaluation.updated",
            message=f"Updated evaluation {evaluation.id}",
            payload={"evaluation_id": evaluation.id},
        )
        await ctx.deps.publish_record(record=evaluation, event=event)
        return UpdateEvaluationResult(success=True, evaluation=evaluation.model_dump())
