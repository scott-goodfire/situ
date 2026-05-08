from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus, TaskEntityKind
from ...common import SituToolDeps, BaseSituTool
from ...common.task_entity_links import link_active_task_entity
from .models import CreateEvaluationResult


class CreateEvaluationTool(BaseSituTool[SituToolDeps, CreateEvaluationResult]):
    name = "create_evaluation"
    result_type = CreateEvaluationResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        evaluation_id: str | None = None,
        associated_baseline_id: str | None = None,
        associated_experiment_id: str | None = None,
        status: RecordStatus = RecordStatus.ACTIVE,
        **_kwargs: Any,
    ) -> CreateEvaluationResult:
        """Create a lightweight evaluation thread for a baseline or experiment.

        Use a short human title and a summary that names the measurement thread,
        the command or fixture being used, and what comparable result it should
        produce. Basic Markdown works in `title` and `summary`; use emphasis,
        inline code, bullets, or a small table when it makes the evaluation
        easier to scan.

        Exactly one of `associated_baseline_id` or `associated_experiment_id`
        is required. The default status is `active` because Scientist-created
        evaluations are intended to receive measurement evidence before
        submission to Critic review.
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_evaluation_id = evaluation_id or await repos.evaluations.next_id(
            project_id=project_id,
        )
        evaluation = await repos.evaluations.create(
            evaluation_id=resolved_evaluation_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            associated_baseline_id=associated_baseline_id,
            associated_experiment_id=associated_experiment_id,
            status=status,
        )
        event = await ctx.deps.record_event(
            event_type="evaluation.created",
            message=f"Created evaluation {evaluation.id}",
            payload={"evaluation_id": evaluation.id},
        )
        await ctx.deps.publish_record(record=evaluation, event=event)
        await link_active_task_entity(
            ctx=ctx,
            entity_kind=TaskEntityKind.EVALUATION,
            entity_id=evaluation.id,
            relationship="created",
        )
        return CreateEvaluationResult(success=True, evaluation=evaluation.model_dump())
