from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import SessionRecord, SessionStatus, parse_session_status
from ..base import BaseRepository
from .command import CreateSession, UpdateSessionProject, UpdateSessionStatus

SESSION_ID_PREFIX = RECORD_ID_PREFIXES["session"]


def _session_row(row: Any) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        workspace_id=row["workspace_id"],
        project_id=row["project_id"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class SessionsRepository(BaseRepository):
    async def create(
        self,
        *,
        session_id: str,
        workspace_id: str,
        project_id: str | None = None,
    ) -> SessionRecord:
        ensure_canonical_record_id(
            record_id=session_id,
            prefix=SESSION_ID_PREFIX,
            noun="session",
        )
        command = CreateSession(
            session_id=session_id,
            workspace_id=workspace_id,
            project_id=project_id,
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO sessions
              (id, workspace_id, project_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                command.session_id,
                command.workspace_id,
                command.project_id,
                SessionStatus.ACTIVE.value,
                now,
                now,
            ),
        )
        record = await self.get_by_id(session_id=command.session_id)
        if record is None:
            raise RuntimeError(f"session was not persisted: {command.session_id}")
        return record

    async def update_status(
        self,
        *,
        session_id: str,
        status: SessionStatus | str,
    ) -> SessionRecord | None:
        checked_status = parse_session_status(status=status)
        command = UpdateSessionStatus(session_id=session_id, status=checked_status)
        if await self.get_by_id(session_id=command.session_id) is None:
            return None
        await self.db.execute(
            "UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?",
            (command.status.value, utc_now(), command.session_id),
        )
        return await self.get_by_id(session_id=command.session_id)

    async def update_project(
        self,
        *,
        session_id: str,
        project_id: str | None,
    ) -> SessionRecord | None:
        command = UpdateSessionProject(session_id=session_id, project_id=project_id)
        if await self.get_by_id(session_id=command.session_id) is None:
            return None
        await self.db.execute(
            "UPDATE sessions SET project_id = ?, updated_at = ? WHERE id = ?",
            (command.project_id, utc_now(), command.session_id),
        )
        return await self.get_by_id(session_id=command.session_id)

    async def get_by_id(self, *, session_id: str) -> SessionRecord | None:
        row = await self.db.fetchone("SELECT * FROM sessions WHERE id = ?", (session_id,))
        return _session_row(row) if row else None

    async def get(self, *, session_id: str) -> SessionRecord | None:
        return await self.get_by_id(session_id=session_id)

    async def list_all(self) -> list[SessionRecord]:
        return [
            _session_row(row)
            for row in await self.db.fetchall("SELECT * FROM sessions ORDER BY created_at")
        ]

    async def list_for_workspace(self, *, workspace_id: str) -> list[SessionRecord]:
        return [
            _session_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM sessions WHERE workspace_id = ? ORDER BY created_at",
                (workspace_id,),
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[SessionRecord]:
        return [
            _session_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM sessions WHERE project_id = ? ORDER BY created_at",
                (project_id,),
            )
        ]

    async def latest(self) -> SessionRecord | None:
        row = await self.db.fetchone(
            "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1"
        )
        return _session_row(row) if row else None

    async def next_id(self) -> str:
        rows = await self.db.fetchall("SELECT id FROM sessions")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=SESSION_ID_PREFIX,
        )
