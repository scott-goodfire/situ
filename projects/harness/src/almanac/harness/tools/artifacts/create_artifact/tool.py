from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import CreateArtifactResult


class CreateArtifactTool(BaseAlmanacTool[AlmanacToolDeps, CreateArtifactResult]):
    name = "create_artifact"
    result_type = CreateArtifactResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        kind: str,
        title: str,
        path: str,
        artifact_id: str | None = None,
        objective_id: str | None = None,
        session_id: str | None = None,
        hypothesis_id: str | None = None,
        experiment_id: str | None = None,
        hypothesis_activity_id: int | None = None,
        experiment_activity_id: int | None = None,
        media_type: str | None = None,
        size_bytes: int | None = None,
        **_kwargs: Any,
    ) -> CreateArtifactResult:
        """Create an artifact reference for a session, hypothesis, or experiment."""
        resolved_session_id = session_id or ctx.deps.session_id
        resolved_objective_id = objective_id or _current_objective_id(
            ctx=ctx,
            session_id=resolved_session_id,
        )
        if resolved_objective_id is None:
            raise ValueError("objective_id is required when there is no current session objective")

        resolved_artifact_id = artifact_id or _next_artifact_id(
            ctx=ctx,
            session_id=resolved_session_id,
        )
        artifact = ctx.deps.repos.artifacts.create(
            artifact_id=resolved_artifact_id,
            objective_id=resolved_objective_id,
            session_id=resolved_session_id,
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
            hypothesis_activity_id=hypothesis_activity_id,
            experiment_activity_id=experiment_activity_id,
            kind=kind,
            title=title,
            path=path,
            media_type=media_type,
            size_bytes=size_bytes,
        )
        ctx.deps.record_event(
            "artifact.created",
            f"Created artifact {artifact.id}",
            payload={"artifact_id": artifact.id},
        )
        return CreateArtifactResult(success=True, artifact=artifact.model_dump())


def _current_objective_id(
    *,
    ctx: RunContext[AlmanacToolDeps],
    session_id: str,
) -> str | None:
    session = ctx.deps.repos.sessions.get(session_id)
    return session.objective_id if session is not None else None


def _next_artifact_id(
    *,
    ctx: RunContext[AlmanacToolDeps],
    session_id: str,
) -> str:
    count = len(ctx.deps.repos.artifacts.list_for_session(session_id)) + 1
    return f"artifact_{session_id}_{count:03d}"
