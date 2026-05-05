from __future__ import annotations

from ...core.db.serialization import config_row, json_dumps, utc_now
from ...records import ProjectConfigRecord
from ..base import BaseRepository
from .project_config_commands import SetProjectConfig


class ProjectConfigRepository(BaseRepository):
    def get(self) -> ProjectConfigRecord | None:
        row = self.db.fetchone("SELECT * FROM project_config WHERE id = ?", (self.db.project_id,))
        return config_row(row) if row else None

    def set(
        self,
        *,
        goal: str,
        evaluation_context: str,
        known_signals: list[str],
        experiment_scope: str,
    ) -> ProjectConfigRecord:
        command = SetProjectConfig(
            goal=goal,
            evaluation_context=evaluation_context,
            known_signals=known_signals,
            experiment_scope=experiment_scope,
        )
        now = utc_now()
        existing = self.get()
        created_at = existing.created_at if existing else now
        self.db.execute(
            """
            INSERT INTO project_config
              (id, repo_path, goal, evaluation_context, known_signals_json,
               experiment_scope, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              repo_path = excluded.repo_path,
              goal = excluded.goal,
              evaluation_context = excluded.evaluation_context,
              known_signals_json = excluded.known_signals_json,
              experiment_scope = excluded.experiment_scope,
              updated_at = excluded.updated_at
            """,
            (
                self.db.project_id,
                self.db.repo_path,
                command.goal,
                command.evaluation_context,
                json_dumps(command.known_signals),
                command.experiment_scope,
                created_at,
                now,
            ),
        )
        record = self.get()
        if record is None:
            raise RuntimeError("project config was not persisted")
        return record
