from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import SituToolDeps, BaseSituTool
from .models import CreateEvaluationResult


class CreateEvaluationTool(BaseSituTool[SituToolDeps, CreateEvaluationResult]):
    name = "create_evaluation"
    result_type = CreateEvaluationResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        evaluation_id: str | None = None,
        associated_baseline_id: str | None = None,
        associated_experiment_id: str | None = None,
        status: WorkStatus = WorkStatus.OPEN,
        **_kwargs: Any,
    ) -> CreateEvaluationResult:
        """Create a lightweight evaluation thread for a baseline or experiment.

        Exactly one of `associated_baseline_id` or `associated_experiment_id`
        is required. `status` must be `open`, `active`, or `closed`.
        """
        repos = ctx.deps.get_repos()
        project_id = ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_evaluation_id = evaluation_id or repos.evaluations.next_id(
            project_id=project_id,
        )
        evaluation = repos.evaluations.create(
            evaluation_id=resolved_evaluation_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            associated_baseline_id=associated_baseline_id,
            associated_experiment_id=associated_experiment_id,
            status=status,
        )
        event = ctx.deps.record_event(
            event_type="evaluation.created",
            message=f"Created evaluation {evaluation.id}",
            payload={"evaluation_id": evaluation.id},
        )
        ctx.deps.publish_record(record=evaluation, event=event)
        return CreateEvaluationResult(success=True, evaluation=evaluation.model_dump())
