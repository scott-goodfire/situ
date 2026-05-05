from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....api.sessions import SessionsService
from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import GetSessionResult


class GetSessionTool(BaseAlmanacTool[AlmanacToolDeps, GetSessionResult]):
    name = "get_session"
    result_type = GetSessionResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        session_id: str | None = None,
        **_kwargs: Any,
    ) -> GetSessionResult:
        """
        Load a session and its related objective, research context,
        hypotheses, experiments, evaluations, links, activities, artifacts,
        and events.
        """
        graph = SessionsService(repos=ctx.deps.get_repos()).get_session(
            session_id or ctx.deps.session_id
        )
        return GetSessionResult(
            success=True,
            project=graph.project.model_dump() if graph.project is not None else None,
            session=graph.session.model_dump() if graph.session is not None else None,
            objective=graph.objective.model_dump() if graph.objective is not None else None,
            research_context=(
                graph.research_context.model_dump()
                if graph.research_context is not None
                else None
            ),
            hypotheses=[hypothesis.model_dump() for hypothesis in graph.hypotheses],
            experiments=[experiment.model_dump() for experiment in graph.experiments],
            evaluations=[evaluation.model_dump() for evaluation in graph.evaluations],
            hypothesis_experiment_links=[
                link.model_dump() for link in graph.hypothesis_experiment_links
            ],
            hypothesis_activities=[
                activity.model_dump() for activity in graph.hypothesis_activities
            ],
            experiment_activities=[
                activity.model_dump() for activity in graph.experiment_activities
            ],
            evaluation_activities=[
                activity.model_dump() for activity in graph.evaluation_activities
            ],
            artifacts=[artifact.model_dump() for artifact in graph.artifacts],
            events=[event.model_dump() for event in graph.events],
        )
