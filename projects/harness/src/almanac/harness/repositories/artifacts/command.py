from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateArtifact(RepositoryCommand):
    artifact_id: str
    objective_id: str
    kind: str
    title: str
    path: str
    associated_entity_kind: str
    associated_entity_id: str
    associated_session_id: str | None = None
    media_type: str | None = None
    size_bytes: int | None = None
