from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import ListArtifactsResult


class ListArtifactsTool(BaseSituTool[SituToolDeps, ListArtifactsResult]):
    name = "list_artifacts"
    result_type = ListArtifactsResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        session_id: str | None = None,
        experiment_id: str | None = None,
        associated_entity_kind: str | None = None,
        associated_entity_id: str | None = None,
        **_kwargs: Any,
    ) -> ListArtifactsResult:
        """List artifact references by experiment or project."""
        repos = ctx.deps.get_repos()
        if associated_entity_kind == "experiment" and associated_entity_id is not None:
            artifacts = repos.artifacts.list_for_experiment(associated_entity_id)
        elif experiment_id is not None:
            artifacts = repos.artifacts.list_for_experiment(experiment_id)
        elif project_id is not None:
            artifacts = repos.artifacts.list_for_project(project_id)
        else:
            artifacts = repos.artifacts.list_for_session(
                session_id or ctx.deps.session_id
            )

        return ListArtifactsResult(
            success=True,
            artifacts=[artifact.model_dump() for artifact in artifacts],
        )
