from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import CreateHypothesisResult


class CreateHypothesisTool(BaseAlmanacTool[AlmanacToolDeps, CreateHypothesisResult]):
    name = "create_hypothesis"
    result_type = CreateHypothesisResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        title: str,
        summary: str,
        objective_id: str | None = None,
        hypothesis_id: str | None = None,
        status: str = "open",
        **_kwargs: Any,
    ) -> CreateHypothesisResult:
        """Create a hypothesis under an objective."""
        repos = ctx.deps.get_repos()
        resolved_objective_id = objective_id or _current_objective_id(ctx)
        if resolved_objective_id is None:
            raise ValueError("objective_id is required when there is no current session objective")

        resolved_hypothesis_id = hypothesis_id or _next_hypothesis_id(
            repos=repos,
            objective_id=resolved_objective_id,
        )
        hypothesis = repos.hypotheses.create(
            hypothesis_id=resolved_hypothesis_id,
            objective_id=resolved_objective_id,
            title=title,
            summary=summary,
            status=status,
            associated_session_id=ctx.deps.session_id,
        )
        event = ctx.deps.record_event(
            "hypothesis.created",
            f"Created hypothesis {hypothesis.id}",
            payload={"hypothesis_id": hypothesis.id},
        )
        ctx.deps.publish_record(hypothesis, event=event)
        return CreateHypothesisResult(success=True, hypothesis=hypothesis.model_dump())


def _current_objective_id(ctx: RunContext[AlmanacToolDeps]) -> str | None:
    session = ctx.deps.get_repos().sessions.get(ctx.deps.session_id)
    return session.objective_id if session is not None else None


def _next_hypothesis_id(
    *,
    repos: Any,
    objective_id: str,
) -> str:
    count = len(repos.hypotheses.list_for_objective(objective_id)) + 1
    return f"hyp_{objective_id}_agent_{count:03d}"
