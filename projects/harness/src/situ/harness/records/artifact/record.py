from __future__ import annotations

from ..base import DbRecord


class ArtifactRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    associated_entity_kind: str
    associated_entity_id: str
    kind: str
    title: str
    path: str
    media_type: str | None = None
    size_bytes: int | None = None
    created_at: str
