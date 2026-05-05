from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...api.agent_context import AgentContextService
from ..common import AlmanacToolDeps, BaseAlmanacTool
from .models import GetAgentContextResult


class GetAgentContextTool(BaseAlmanacTool[AlmanacToolDeps, GetAgentContextResult]):
    name = "get_agent_context"
    result_type = GetAgentContextResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        **_kwargs: Any,
    ) -> GetAgentContextResult:
        agent_context = AgentContextService(repos=ctx.deps.repos).get(ctx.deps.session_id)
        return GetAgentContextResult(
            success=True,
            config=agent_context.config.model_dump() if agent_context.config is not None else None,
            objective=(
                agent_context.objective.model_dump()
                if agent_context.objective is not None
                else None
            ),
            session=(
                agent_context.session.model_dump() if agent_context.session is not None else None
            ),
            active_hypotheses=[
                hypothesis.model_dump() for hypothesis in agent_context.active_hypotheses
            ],
            recent_experiments=[
                experiment.model_dump() for experiment in agent_context.recent_experiments
            ],
            hypothesis_experiment_links=[
                link.model_dump() for link in agent_context.hypothesis_experiment_links
            ],
            recent_hypothesis_activities=[
                activity.model_dump()
                for activity in agent_context.recent_hypothesis_activities
            ],
            recent_experiment_activities=[
                activity.model_dump()
                for activity in agent_context.recent_experiment_activities
            ],
            recent_artifacts=[
                artifact.model_dump() for artifact in agent_context.recent_artifacts
            ],
            recent_events=[event.model_dump() for event in agent_context.recent_events],
        )
