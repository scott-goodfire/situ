from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import ArtifactRecord
from ..base import BaseRepository
from .command import CreateArtifact


def _artifact_row(row: Any) -> ArtifactRecord:
    return ArtifactRecord(
        id=row["id"],
        session_id=row["session_id"],
        associated_entity_kind=row["associated_entity_kind"],
        associated_entity_id=row["associated_entity_id"],
        kind=row["kind"],
        title=row["title"],
        path=row["path"],
        media_type=row["media_type"],
        size_bytes=row["size_bytes"],
        created_at=row["created_at"],
    )


class ArtifactsRepository(BaseRepository):
    def create(
        self,
        *,
        artifact_id: str,
        session_id: str,
        kind: str,
        title: str,
        path: str,
        associated_entity_kind: str,
        associated_entity_id: str,
        media_type: str | None = None,
        size_bytes: int | None = None,
    ) -> ArtifactRecord:
        command = CreateArtifact(
            artifact_id=artifact_id,
            session_id=session_id,
            kind=kind,
            title=title,
            path=path,
            associated_entity_kind=associated_entity_kind,
            associated_entity_id=associated_entity_id,
            media_type=media_type,
            size_bytes=size_bytes,
        )
        self.db.execute(
            """
            INSERT INTO artifacts
              (id, session_id, associated_entity_kind, associated_entity_id,
               kind, title, path, media_type, size_bytes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.artifact_id,
                command.session_id,
                command.associated_entity_kind,
                command.associated_entity_id,
                command.kind,
                command.title,
                command.path,
                command.media_type,
                command.size_bytes,
                utc_now(),
            ),
        )
        record = self.get_by_id(command.artifact_id)
        if record is None:
            raise RuntimeError(f"artifact was not persisted: {command.artifact_id}")
        return record

    def get_by_id(self, artifact_id: str) -> ArtifactRecord | None:
        row = self.db.fetchone("SELECT * FROM artifacts WHERE id = ?", (artifact_id,))
        return _artifact_row(row) if row else None

    def get(self, artifact_id: str) -> ArtifactRecord | None:
        return self.get_by_id(artifact_id)

    def list_all(self) -> list[ArtifactRecord]:
        return [
            _artifact_row(row)
            for row in self.db.fetchall("SELECT * FROM artifacts ORDER BY created_at")
        ]

    def list_for_experiment(self, experiment_id: str) -> list[ArtifactRecord]:
        return [
            _artifact_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM artifacts
                WHERE associated_entity_kind = 'experiment'
                  AND associated_entity_id = ?
                ORDER BY created_at
                """,
                (experiment_id,),
            )
        ]

    def list_for_session(self, session_id: str) -> list[ArtifactRecord]:
        return [
            _artifact_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM artifacts WHERE session_id = ? ORDER BY created_at",
                (session_id,),
            )
        ]
