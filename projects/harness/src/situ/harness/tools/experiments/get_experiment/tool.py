from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetExperimentResult


class GetExperimentTool(BaseSituTool[SituToolDeps, GetExperimentResult]):
    name = "get_experiment"
    result_type = GetExperimentResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        **_kwargs: Any,
    ) -> GetExperimentResult:
        """Read an experiment record by id."""
        repos = await ctx.deps.get_repos()
        experiment = await repos.experiments.get(experiment_id=experiment_id)
        if experiment is None:
            return self._failure(
                code="experiment_not_found",
                message=f"Experiment '{experiment_id}' was not found.",
            )
        return GetExperimentResult(
            success=True,
            experiment=experiment.model_dump(),
        )
