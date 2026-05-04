from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from ..database import Database
from ..models import AddEvent
from ..serialization import event_row, json_dumps, utc_now


class EventsRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database

    def add(
        self,
        *,
        event_type: str,
        message: str,
        run_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
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
        return {
            "id": int(cursor.lastrowid),
            "run_id": command.run_id,
            "type": command.event_type,
            "message": command.message,
            "payload": command.payload,
            "created_at": created_at,
        }

    def list_all(self) -> list[dict[str, Any]]:
        return [event_row(row) for row in self.db.fetchall("SELECT * FROM events ORDER BY id")]

    def list_for_run(self, run_id: str) -> list[dict[str, Any]]:
        return [
            event_row(row)
            for row in self.db.fetchall("SELECT * FROM events WHERE run_id = ? ORDER BY id", (run_id,))
        ]
