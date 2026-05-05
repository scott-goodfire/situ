from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateArtifact(RepositoryCommand):
    artifact_id: str
    objective_id: str
    kind: str
    title: str
    path: str
    session_id: str | None = None
    hypothesis_id: str | None = None
    experiment_id: str | None = None
    hypothesis_activity_id: int | None = None
    experiment_activity_id: int | None = None
    media_type: str | None = None
    size_bytes: int | None = None
