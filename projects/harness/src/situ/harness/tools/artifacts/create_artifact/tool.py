from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import Any

from pydantic_ai import RunContext

from ....records import TaskEntityKind
from ....repositories.artifacts.repository import ARTIFACT_ID_ALLOCATION_LOCK
from ...common import SituToolDeps, BaseSituTool
from ...common.task_entity_links import link_active_task_entity
from .models import CreateArtifactResult

_SAFE_ARTIFACT_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


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
        produced during a run. Pass `path` as a path the harness can resolve.
        If the path is outside Situ project state and points at a readable
        file, Situ copies it into the project artifact store and records the
        project-relative materialized path. Use `kind` for a short tag like
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
        async with ARTIFACT_ID_ALLOCATION_LOCK:
            resolved_artifact_id = artifact_id or await repos.artifacts.next_id(
                project_id=project_id,
            )
            materialized_path, materialized_size = _materialize_artifact_path(
                raw_path=path,
                artifact_id=resolved_artifact_id,
                project_dir=ctx.deps.project_dir,
            )
            artifact = await repos.artifacts.create(
                artifact_id=resolved_artifact_id,
                project_id=project_id,
                created_in_session_id=session_id,
                associated_entity_kind=resolved_entity_kind,
                associated_entity_id=resolved_entity_id,
                kind=kind,
                title=title,
                path=materialized_path,
                media_type=media_type,
                size_bytes=size_bytes if size_bytes is not None else materialized_size,
            )
        event = await ctx.deps.record_event(
            event_type="artifact.created",
            message=f"Created artifact {artifact.id}",
            payload={"artifact_id": artifact.id},
        )
        await ctx.deps.publish_record(record=artifact, event=event)
        await link_active_task_entity(
            ctx=ctx,
            entity_kind=TaskEntityKind.ARTIFACT,
            entity_id=artifact.id,
            relationship="created",
        )
        return CreateArtifactResult(success=True, artifact=artifact.model_dump())


def _materialize_artifact_path(
    *,
    raw_path: str,
    artifact_id: str,
    project_dir: Path | None,
) -> tuple[str, int | None]:
    path = Path(raw_path).expanduser()
    if project_dir is None:
        if path.is_absolute():
            raise ValueError("absolute artifact paths require project state")
        return str(path), None

    project_root = project_dir.resolve()
    if path.is_absolute():
        resolved = path.resolve()
        try:
            return str(resolved.relative_to(project_root)), _file_size(resolved)
        except ValueError:
            if not resolved.is_file():
                raise ValueError(
                    "artifact path outside project state must be a readable file"
                )
            destination = (
                project_root
                / "artifacts"
                / "manual"
                / artifact_id
                / _safe_artifact_name(resolved.name)
            )
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(resolved, destination)
            return (
                str(destination.relative_to(project_root)),
                destination.stat().st_size,
            )

    resolved = (project_root / path).resolve()
    try:
        relative = resolved.relative_to(project_root)
    except ValueError as error:
        raise ValueError("artifact path is outside project state") from error
    return str(relative), _file_size(resolved)


def _file_size(path: Path) -> int | None:
    return path.stat().st_size if path.is_file() else None


def _safe_artifact_name(name: str) -> str:
    safe = _SAFE_ARTIFACT_NAME_RE.sub("-", name).strip(".-")
    return safe or "artifact"
