from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import ListArtifactsResult


class ListArtifactsTool(BaseSituTool[SituToolDeps, ListArtifactsResult]):
    name = "list_artifacts"
    result_type = ListArtifactsResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str | None = None,
        associated_entity_kind: str | None = None,
        associated_entity_id: str | None = None,
        **_kwargs: Any,
    ) -> ListArtifactsResult:
        """List artifact references in the current project, optionally narrowed to one experiment."""
        repos = await ctx.deps.get_repos()
        if associated_entity_kind == "experiment" and associated_entity_id is not None:
            artifacts = await repos.artifacts.list_for_experiment(
                experiment_id=associated_entity_id
            )
        elif experiment_id is not None:
            artifacts = await repos.artifacts.list_for_experiment(experiment_id=experiment_id)
        else:
            resolved_project_id = await ctx.deps.current_project_id()
            artifacts = (
                await repos.artifacts.list_for_project(project_id=resolved_project_id)
                if resolved_project_id is not None
                else []
            )

        return ListArtifactsResult(
            success=True,
            artifacts=[artifact.model_dump() for artifact in artifacts],
        )
