from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateArtifact(RepositoryCommand):
    artifact_id: str
    project_id: str
    created_in_session_id: str | None = None
    kind: str
    title: str
    path: str
    associated_entity_kind: str
    associated_entity_id: str
    media_type: str | None = None
    size_bytes: int | None = None
