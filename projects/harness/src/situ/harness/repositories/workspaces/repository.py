from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import WorkspaceRecord
from ..base import BaseRepository


def _workspace_row(row: Any) -> WorkspaceRecord:
    return WorkspaceRecord(
        id=row["id"],
        repo_path=row["repo_path"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class WorkspacesRepository(BaseRepository):
    def get(self, workspace_id: str | None = None) -> WorkspaceRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM workspaces WHERE id = ?",
            (workspace_id or self.db.workspace_id,),
        )
        return _workspace_row(row) if row else None

    def ensure(self) -> WorkspaceRecord:
        existing = self.get()
        now = utc_now()
        if existing is None:
            self.db.execute(
                """
                INSERT INTO workspaces (id, repo_path, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (self.db.workspace_id, self.db.repo_path, now, now),
            )
        else:
            self.db.execute(
                """
                UPDATE workspaces
                SET repo_path = ?, updated_at = ?
                WHERE id = ?
                """,
                (self.db.repo_path, now, self.db.workspace_id),
            )
        record = self.get()
        if record is None:
            raise RuntimeError("workspace was not persisted")
        return record

    def list_all(self) -> list[WorkspaceRecord]:
        return [
            _workspace_row(row)
            for row in self.db.fetchall("SELECT * FROM workspaces ORDER BY created_at")
        ]
