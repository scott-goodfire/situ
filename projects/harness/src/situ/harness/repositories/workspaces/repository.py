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
    async def get(self, *, workspace_id: str | None = None) -> WorkspaceRecord | None:
        row = await self.db.fetchone(
            "SELECT * FROM workspaces WHERE id = ?",
            (workspace_id or self.db.workspace_id,),
        )
        return _workspace_row(row) if row else None

    async def ensure(self) -> WorkspaceRecord:
        existing = await self.get()
        now = utc_now()
        if existing is None:
            await self.db.execute(
                """
                INSERT INTO workspaces (id, repo_path, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (self.db.workspace_id, self.db.repo_path, now, now),
            )
        else:
            await self.db.execute(
                """
                UPDATE workspaces
                SET repo_path = ?, updated_at = ?
                WHERE id = ?
                """,
                (self.db.repo_path, now, self.db.workspace_id),
            )
        record = await self.get()
        if record is None:
            raise RuntimeError("workspace was not persisted")
        return record

    async def list_all(self) -> list[WorkspaceRecord]:
        return [
            _workspace_row(row)
            for row in await self.db.fetchall("SELECT * FROM workspaces ORDER BY created_at")
        ]
