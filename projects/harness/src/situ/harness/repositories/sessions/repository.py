from __future__ import annotations

from ...core.db.serialization import session_row, utc_now
from ...records import SessionRecord, SessionStatus, parse_session_status
from ..base import BaseRepository
from .command import CreateSession, UpdateSessionStatus


class SessionsRepository(BaseRepository):
    def create(
        self,
        session_id: str,
        *,
        project_id: str,
    ) -> SessionRecord:
        command = CreateSession(
            session_id=session_id,
            project_id=project_id,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO sessions
              (id, project_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                command.session_id,
                command.project_id,
                SessionStatus.ACTIVE.value,
                now,
                now,
            ),
        )
        record = self.get_by_id(command.session_id)
        if record is None:
            raise RuntimeError(f"session was not persisted: {command.session_id}")
        return record

    def update_status(
        self,
        session_id: str,
        status: SessionStatus | str,
    ) -> SessionRecord | None:
        checked_status = parse_session_status(status=status)
        command = UpdateSessionStatus(session_id=session_id, status=checked_status)
        if self.get_by_id(command.session_id) is None:
            return None
        self.db.execute(
            "UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?",
            (command.status.value, utc_now(), command.session_id),
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

    def list_for_project(self, project_id: str) -> list[SessionRecord]:
        return [
            session_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM sessions WHERE project_id = ? ORDER BY created_at",
                (project_id,),
            )
        ]

    def latest(self) -> SessionRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1"
        )
        return session_row(row) if row else None
