from __future__ import annotations

from ...core.db.serialization import artifact_row, utc_now
from ...records import ArtifactRecord
from ..base import BaseRepository
from .command import CreateArtifact


class ArtifactsRepository(BaseRepository):
    def create(
        self,
        *,
        artifact_id: str,
        objective_id: str,
        kind: str,
        title: str,
        path: str,
        session_id: str | None = None,
        hypothesis_id: str | None = None,
        experiment_id: str | None = None,
        hypothesis_activity_id: int | None = None,
        experiment_activity_id: int | None = None,
        media_type: str | None = None,
        size_bytes: int | None = None,
    ) -> ArtifactRecord:
        command = CreateArtifact(
            artifact_id=artifact_id,
            objective_id=objective_id,
            kind=kind,
            title=title,
            path=path,
            session_id=session_id,
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
            hypothesis_activity_id=hypothesis_activity_id,
            experiment_activity_id=experiment_activity_id,
            media_type=media_type,
            size_bytes=size_bytes,
        )
        self.db.execute(
            """
            INSERT INTO artifacts
              (id, objective_id, session_id, hypothesis_id, experiment_id,
               hypothesis_activity_id, experiment_activity_id, kind, title, path,
               media_type, size_bytes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.artifact_id,
                command.objective_id,
                command.session_id,
                command.hypothesis_id,
                command.experiment_id,
                command.hypothesis_activity_id,
                command.experiment_activity_id,
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
        return artifact_row(row) if row else None

    def get(self, artifact_id: str) -> ArtifactRecord | None:
        return self.get_by_id(artifact_id)

    def list_all(self) -> list[ArtifactRecord]:
        return [
            artifact_row(row)
            for row in self.db.fetchall("SELECT * FROM artifacts ORDER BY created_at")
        ]

    def list_for_experiment(self, experiment_id: str) -> list[ArtifactRecord]:
        return [
            artifact_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM artifacts WHERE experiment_id = ? ORDER BY created_at",
                (experiment_id,),
            )
        ]

    def list_for_session(self, session_id: str) -> list[ArtifactRecord]:
        return [
            artifact_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM artifacts WHERE session_id = ? ORDER BY created_at",
                (session_id,),
            )
        ]
