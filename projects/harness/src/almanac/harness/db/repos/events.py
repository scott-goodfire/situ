from __future__ import annotations

from typing import Any

from ..models import AddEvent
from ..records import EventRecord
from ..serialization import event_row, json_dumps, utc_now
from .base import BaseRepository


class EventsRepository(BaseRepository):
    def add(
        self,
        *,
        event_type: str,
        message: str,
        run_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> EventRecord:
        command = AddEvent(
            event_type=event_type,
            message=message,
            run_id=run_id,
            payload=payload or {},
        )
        created_at = utc_now()
        cursor = self.db.execute(
            """
            INSERT INTO events (run_id, type, message, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                command.run_id,
                command.event_type,
                command.message,
                json_dumps(command.payload),
                created_at,
            ),
        )
        return EventRecord(
            id=int(cursor.lastrowid),
            run_id=command.run_id,
            type=command.event_type,
            message=command.message,
            payload=command.payload,
            created_at=created_at,
        )

    def get_by_id(self, event_id: int) -> EventRecord | None:
        row = self.db.fetchone("SELECT * FROM events WHERE id = ?", (event_id,))
        return event_row(row) if row else None

    def list_all(self) -> list[EventRecord]:
        return [event_row(row) for row in self.db.fetchall("SELECT * FROM events ORDER BY id")]

    def list_for_run(self, run_id: str) -> list[EventRecord]:
        return [
            event_row(row)
            for row in self.db.fetchall("SELECT * FROM events WHERE run_id = ? ORDER BY id", (run_id,))
        ]
