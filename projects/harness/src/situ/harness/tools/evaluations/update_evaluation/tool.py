from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import SituToolDeps, BaseSituTool
from .models import UpdateEvaluationResult


class UpdateEvaluationTool(BaseSituTool[SituToolDeps, UpdateEvaluationResult]):
    name = "update_evaluation"
    result_type = UpdateEvaluationResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | None = None,
        associated_baseline_id: str | None = None,
        associated_experiment_id: str | None = None,
        **_kwargs: Any,
    ) -> UpdateEvaluationResult:
        """Update simple evaluation fields.

        `status` must be `open`, `active`, or `closed`. Setting
        `associated_baseline_id` switches the measured subject to that
        baseline; setting `associated_experiment_id` switches it to that
        experiment. Put raw evidence, failures, suspiciousness, and
        interpretations in measurements.
        """
        evaluation = ctx.deps.get_repos().evaluations.update(
            evaluation_id=evaluation_id,
            title=title,
            summary=summary,
            status=status,
            associated_baseline_id=associated_baseline_id,
            associated_experiment_id=associated_experiment_id,
        )
        if evaluation is None:
            raise ValueError(f"evaluation not found: {evaluation_id}")

        event = ctx.deps.record_event(
            "evaluation.updated",
            f"Updated evaluation {evaluation.id}",
            payload={"evaluation_id": evaluation.id},
        )
        ctx.deps.publish_record(evaluation, event=event)
        return UpdateEvaluationResult(success=True, evaluation=evaluation.model_dump())
