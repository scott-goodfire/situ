from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import CreateArtifactResult


class CreateArtifactTool(BaseSituTool[SituToolDeps, CreateArtifactResult]):
    name = "create_artifact"
    result_type = CreateArtifactResult
    sequential = True

    async def execute(
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
        """Create an artifact reference for a project, hypothesis, or experiment.

        An artifact is a durable receipt: a log file, command-output capture,
        patch handoff, screenshot, generated diff, or other on-disk evidence
        produced during a run. Pass `path` as a path the harness can resolve
        (typically under `SITU_ARTIFACT_DIR`); the artifact record points at
        it rather than copying the bytes. Use `kind` for a short tag like
        `command_receipt`, `patch_handoff`, `log`, or `screenshot`. By default
        the artifact attaches to the current project; set
        `associated_entity_kind` and `associated_entity_id` to attach to a
        specific hypothesis or experiment instead.
        """
        repos = await ctx.deps.get_repos()
        project_id = await ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_entity_kind = associated_entity_kind or "project"
        resolved_entity_id = associated_entity_id or project_id
        resolved_artifact_id = artifact_id or await repos.artifacts.next_id(
            project_id=project_id,
        )
        artifact = await repos.artifacts.create(
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
        event = await ctx.deps.record_event(
            event_type="artifact.created",
            message=f"Created artifact {artifact.id}",
            payload={"artifact_id": artifact.id},
        )
        await ctx.deps.publish_record(record=artifact, event=event)
        return CreateArtifactResult(success=True, artifact=artifact.model_dump())
