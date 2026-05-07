from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import CreateArtifactResult


class CreateArtifactTool(BaseSituTool[SituToolDeps, CreateArtifactResult]):
    name = "create_artifact"
    result_type = CreateArtifactResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        kind: str,
        title: str,
        path: str,
        artifact_id: str | None = None,
        associated_entity_kind: str | None = None,
        associated_entity_id: str | None = None,
        media_type: str | None = None,
        size_bytes: int | None = None,
        **_kwargs: Any,
    ) -> CreateArtifactResult:
        """Create an artifact reference for a project, hypothesis, or experiment."""
        repos = ctx.deps.get_repos()
        project_id = ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_entity_kind = associated_entity_kind or "project"
        resolved_entity_id = associated_entity_id or project_id
        resolved_artifact_id = artifact_id or repos.artifacts.next_id(
            project_id=project_id,
        )
        artifact = repos.artifacts.create(
            artifact_id=resolved_artifact_id,
            project_id=project_id,
            created_in_session_id=session_id,
            associated_entity_kind=resolved_entity_kind,
            associated_entity_id=resolved_entity_id,
            kind=kind,
            title=title,
            path=path,
            media_type=media_type,
            size_bytes=size_bytes,
        )
        event = ctx.deps.record_event(
            event_type="artifact.created",
            message=f"Created artifact {artifact.id}",
            payload={"artifact_id": artifact.id},
        )
        ctx.deps.publish_record(record=artifact, event=event)
        return CreateArtifactResult(success=True, artifact=artifact.model_dump())
