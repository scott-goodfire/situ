from __future__ import annotations

from ...core.db.serialization import config_row, utc_now
from ...records import ProjectConfigRecord
from ..base import BaseRepository
from .command import SetProjectConfig


class ProjectConfigRepository(BaseRepository):
    def get(self) -> ProjectConfigRecord | None:
        row = self.db.fetchone("SELECT * FROM project_config WHERE id = ?", (self.db.project_id,))
        return config_row(row) if row else None

    def set(
        self,
        *,
        research_context: str,
        associated_session_id: str | None = None,
    ) -> ProjectConfigRecord:
        command = SetProjectConfig(
            research_context=research_context,
            associated_session_id=associated_session_id,
        )
        now = utc_now()
        existing = self.get()
        created_at = existing.created_at if existing else now
        self.db.execute(
            """
            INSERT INTO project_config
              (id, repo_path, research_context, associated_session_id,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              repo_path = excluded.repo_path,
              research_context = excluded.research_context,
              associated_session_id = excluded.associated_session_id,
              updated_at = excluded.updated_at
            """,
            (
                self.db.project_id,
                self.db.repo_path,
                command.research_context,
                command.associated_session_id,
                created_at,
                now,
            ),
        )
        record = self.get()
        if record is None:
            raise RuntimeError("project config was not persisted")
        return record
