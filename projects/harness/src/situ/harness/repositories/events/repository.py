from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import EventRecord
from ..base import BaseRepository
from .command import AddEvent


def _event_row(row: Any) -> EventRecord:
    return EventRecord(
        id=row["id"],
        session_id=row["session_id"],
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
        session_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> EventRecord:
        command = AddEvent(
            event_type=event_type,
            message=message,
            session_id=session_id,
            payload=payload or {},
        )
        cursor = self.db.execute(
            """
            INSERT INTO events (session_id, type, message, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                command.session_id,
                command.event_type,
                command.message,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = self.get_by_id(int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("event was not persisted")
        return record

    def get_by_id(self, event_id: int) -> EventRecord | None:
        row = self.db.fetchone("SELECT * FROM events WHERE id = ?", (event_id,))
        return _event_row(row) if row else None

    def get(self, event_id: int) -> EventRecord | None:
        return self.get_by_id(event_id)

    def list_all(self) -> list[EventRecord]:
        return [_event_row(row) for row in self.db.fetchall("SELECT * FROM events ORDER BY id")]

    def list_for_session(self, session_id: str) -> list[EventRecord]:
        return [
            _event_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM events WHERE session_id = ? ORDER BY id",
                (session_id,),
            )
        ]
