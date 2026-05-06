from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import ProjectRecord
from ..base import BaseRepository


def _project_row(row: Any) -> ProjectRecord:
    return ProjectRecord(
        id=row["id"],
        repo_path=row["repo_path"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class ProjectRepository(BaseRepository):
    def get(self) -> ProjectRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM projects WHERE id = ?", (self.db.project_id,)
        )
        return _project_row(row) if row else None

    def ensure(self) -> ProjectRecord:
        existing = self.get()
        now = utc_now()
        if existing is None:
            self.db.execute(
                """
                INSERT INTO projects (id, repo_path, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (self.db.project_id, self.db.repo_path, now, now),
            )
        else:
            self.db.execute(
                """
                UPDATE projects
                SET repo_path = ?, updated_at = ?
                WHERE id = ?
                """,
                (self.db.repo_path, now, self.db.project_id),
            )
        record = self.get()
        if record is None:
            raise RuntimeError("project was not persisted")
        return record
