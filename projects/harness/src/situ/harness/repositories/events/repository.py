from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import EventRecord
from ..base import BaseRepository
from .command import AddEvent


def _event_row(row: Any) -> EventRecord:
    return EventRecord(
        id=row["id"],
        associated_project_id=row["associated_project_id"],
        associated_session_id=row["associated_session_id"],
        type=row["type"],
        message=row["message"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class EventsRepository(BaseRepository):
    def add(
        self,
        *,
        event_type: str,
        message: str,
        associated_project_id: str | None = None,
        associated_session_id: str | None = None,
        session_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> EventRecord:
        resolved_session_id = associated_session_id or session_id
        resolved_project_id = associated_project_id
        if resolved_project_id is None and resolved_session_id is not None:
            resolved_project_id = self._project_id_for_session(resolved_session_id)
        command = AddEvent(
            event_type=event_type,
            message=message,
            associated_project_id=resolved_project_id,
            associated_session_id=resolved_session_id,
            payload=payload or {},
        )
        cursor = self.db.execute_blocking(
            """
            INSERT INTO events
              (associated_project_id, associated_session_id, type, message,
               payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                command.associated_project_id,
                command.associated_session_id,
                command.event_type,
                command.message,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = self.get_by_id(event_id=int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("event was not persisted")
        return record

    def get_by_id(self, *, event_id: int) -> EventRecord | None:
        row = self.db.fetchone_blocking("SELECT * FROM events WHERE id = ?", (event_id,))
        return _event_row(row) if row else None

    def get(self, *, event_id: int) -> EventRecord | None:
        return self.get_by_id(event_id=event_id)

    def list_all(self) -> list[EventRecord]:
        return [_event_row(row) for row in self.db.fetchall_blocking("SELECT * FROM events ORDER BY id")]

    def list_for_session(self, *, session_id: str) -> list[EventRecord]:
        return [
            _event_row(row)
            for row in self.db.fetchall_blocking(
                "SELECT * FROM events WHERE associated_session_id = ? ORDER BY id",
                (session_id,),
            )
        ]

    def list_for_project(self, *, project_id: str) -> list[EventRecord]:
        return [
            _event_row(row)
            for row in self.db.fetchall_blocking(
                "SELECT * FROM events WHERE associated_project_id = ? ORDER BY id",
                (project_id,),
            )
        ]

    def _project_id_for_session(self, session_id: str) -> str | None:
        row = self.db.fetchone_blocking("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        return row["project_id"] if row else None
