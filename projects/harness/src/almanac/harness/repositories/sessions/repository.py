from __future__ import annotations

from ...core.db.serialization import session_row, utc_now
from ...records import SessionRecord
from ..base import BaseRepository
from .command import CreateSession, UpdateSessionStatus


class SessionsRepository(BaseRepository):
    def create(self, session_id: str, *, objective_id: str) -> SessionRecord:
        command = CreateSession(session_id=session_id, objective_id=objective_id)
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO sessions (id, objective_id, status, created_at, updated_at)
            VALUES (?, ?, 'active', ?, ?)
            """,
            (command.session_id, command.objective_id, now, now),
        )
        record = self.get_by_id(command.session_id)
        if record is None:
            raise RuntimeError(f"session was not persisted: {command.session_id}")
        return record

    def update_status(self, session_id: str, status: str) -> SessionRecord | None:
        command = UpdateSessionStatus(session_id=session_id, status=status)
        if self.get_by_id(command.session_id) is None:
            return None
        self.db.execute(
            "UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?",
            (command.status, utc_now(), command.session_id),
        )
        return self.get_by_id(command.session_id)

    def get_by_id(self, session_id: str) -> SessionRecord | None:
        row = self.db.fetchone("SELECT * FROM sessions WHERE id = ?", (session_id,))
        return session_row(row) if row else None

    def get(self, session_id: str) -> SessionRecord | None:
        return self.get_by_id(session_id)

    def list_all(self) -> list[SessionRecord]:
        return [
            session_row(row)
            for row in self.db.fetchall("SELECT * FROM sessions ORDER BY created_at")
        ]

    def list_for_objective(self, objective_id: str) -> list[SessionRecord]:
        return [
            session_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM sessions WHERE objective_id = ? ORDER BY created_at",
                (objective_id,),
            )
        ]
