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
        """Create an artifact reference for a session, hypothesis, or experiment."""
        repos = ctx.deps.get_repos()
        session_id = ctx.deps.session_id
        resolved_entity_kind = associated_entity_kind or "session"
        resolved_entity_id = associated_entity_id or session_id
        resolved_artifact_id = artifact_id or _next_artifact_id(
            repos=repos,
            session_id=session_id,
        )
        artifact = repos.artifacts.create(
            artifact_id=resolved_artifact_id,
            session_id=session_id,
            associated_entity_kind=resolved_entity_kind,
            associated_entity_id=resolved_entity_id,
            kind=kind,
            title=title,
            path=path,
            media_type=media_type,
            size_bytes=size_bytes,
        )
        event = ctx.deps.record_event(
            "artifact.created",
            f"Created artifact {artifact.id}",
            payload={"artifact_id": artifact.id},
        )
        ctx.deps.publish_record(artifact, event=event)
        return CreateArtifactResult(success=True, artifact=artifact.model_dump())


def _next_artifact_id(
    *,
    repos: Any,
    session_id: str,
) -> str:
    count = len(repos.artifacts.list_for_session(session_id)) + 1
    return f"artifact_{session_id}_{count:03d}"
