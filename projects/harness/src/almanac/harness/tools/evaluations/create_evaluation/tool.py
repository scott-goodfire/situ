from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import CreateEvaluationResult


class CreateEvaluationTool(BaseAlmanacTool[AlmanacToolDeps, CreateEvaluationResult]):
    name = "create_evaluation"
    result_type = CreateEvaluationResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        title: str,
        summary: str,
        objective_id: str | None = None,
        session_id: str | None = None,
        evaluation_id: str | None = None,
        associated_experiment_id: str | None = None,
        status: WorkStatus = WorkStatus.OPEN,
        **_kwargs: Any,
    ) -> CreateEvaluationResult:
        """Create a lightweight evaluation thread for baseline or candidate evidence.

        `status` must be `open`, `active`, or `closed`.
        """
        repos = ctx.deps.get_repos()
        resolved_session_id = session_id or ctx.deps.session_id
        resolved_objective_id = objective_id or _current_objective_id(
            repos=repos,
            session_id=resolved_session_id,
        )
        if resolved_objective_id is None:
            raise ValueError("objective_id is required when there is no current session objective")

        resolved_evaluation_id = evaluation_id or _next_evaluation_id(
            repos=repos,
            session_id=resolved_session_id,
        )
        evaluation = repos.evaluations.create(
            evaluation_id=resolved_evaluation_id,
            objective_id=resolved_objective_id,
            title=title,
            summary=summary,
            associated_session_id=resolved_session_id,
            associated_experiment_id=associated_experiment_id,
            status=status,
        )
        event = ctx.deps.record_event(
            "evaluation.created",
            f"Created evaluation {evaluation.id}",
            payload={"evaluation_id": evaluation.id},
        )
        ctx.deps.publish_record(evaluation, event=event)
        return CreateEvaluationResult(success=True, evaluation=evaluation.model_dump())


def _current_objective_id(
    *,
    repos: Any,
    session_id: str,
) -> str | None:
    session = repos.sessions.get(session_id)
    return session.objective_id if session is not None else None


def _next_evaluation_id(
    *,
    repos: Any,
    session_id: str,
) -> str:
    count = len(repos.evaluations.list_for_session(session_id)) + 1
    return f"eval_{session_id}_agent_{count:03d}"
