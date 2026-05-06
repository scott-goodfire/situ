from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import ObjectiveRecord, ObjectiveStatus, parse_objective_status
from ..base import BaseRepository
from .command import CreateObjective, UpdateObjective


def _objective_row(row: Any) -> ObjectiveRecord:
    return ObjectiveRecord(
        id=row["id"],
        session_id=row["session_id"],
        title=row["title"],
        description=row["description"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class ObjectivesRepository(BaseRepository):
    def create(
        self,
        *,
        objective_id: str,
        session_id: str,
        title: str,
        description: str,
        status: ObjectiveStatus | str = ObjectiveStatus.ACTIVE,
    ) -> ObjectiveRecord:
        checked_status = parse_objective_status(status=status)
        command = CreateObjective(
            objective_id=objective_id,
            session_id=session_id,
            title=title,
            description=description,
            status=checked_status,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO objectives
              (id, session_id, title, description, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.objective_id,
                command.session_id,
                command.title,
                command.description,
                command.status.value,
                now,
                now,
            ),
        )
        record = self.get_by_id(command.objective_id)
        if record is None:
            raise RuntimeError(f"objective was not persisted: {command.objective_id}")
        return record

    def update(
        self,
        objective_id: str,
        *,
        title: str | None = None,
        description: str | None = None,
        status: ObjectiveStatus | str | None = None,
    ) -> ObjectiveRecord | None:
        checked_status = (
            parse_objective_status(status=status)
            if status is not None
            else None
        )
        command = UpdateObjective(
            objective_id=objective_id,
            title=title,
            description=description,
            status=checked_status,
        )
        current = self.get_by_id(command.objective_id)
        if current is None:
            return None

        self.db.execute(
            """
            UPDATE objectives
            SET title = ?, description = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.description if command.description is not None else current.description,
                command.status.value if command.status is not None else current.status.value,
                utc_now(),
                command.objective_id,
            ),
        )
        return self.get_by_id(command.objective_id)

    def get_by_id(self, objective_id: str) -> ObjectiveRecord | None:
        row = self.db.fetchone("SELECT * FROM objectives WHERE id = ?", (objective_id,))
        return _objective_row(row) if row else None

    def get(self, objective_id: str) -> ObjectiveRecord | None:
        return self.get_by_id(objective_id)

    def get_for_session(self, session_id: str) -> ObjectiveRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM objectives WHERE session_id = ?", (session_id,)
        )
        return _objective_row(row) if row else None

    def list_all(self) -> list[ObjectiveRecord]:
        return [
            _objective_row(row)
            for row in self.db.fetchall("SELECT * FROM objectives ORDER BY created_at")
        ]
