from __future__ import annotations

from ...core.db.serialization import objective_row, utc_now
from ...records import ObjectiveRecord, ObjectiveStatus, parse_objective_status
from ..base import BaseRepository
from .command import CreateObjective, UpdateObjective


class ObjectivesRepository(BaseRepository):
    def create(
        self,
        *,
        objective_id: str,
        title: str,
        description: str,
        status: ObjectiveStatus | str = ObjectiveStatus.ACTIVE,
        associated_session_id: str | None = None,
    ) -> ObjectiveRecord:
        checked_status = parse_objective_status(status=status)
        command = CreateObjective(
            objective_id=objective_id,
            title=title,
            description=description,
            status=checked_status,
            associated_session_id=associated_session_id,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO objectives
              (id, title, description, status, associated_session_id,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.objective_id,
                command.title,
                command.description,
                command.status.value,
                command.associated_session_id,
                now,
                now,
            ),
        )
        record = self.get_by_id(command.objective_id)
        if record is None:
            raise RuntimeError(f"objective was not persisted: {command.objective_id}")
        return record

    def upsert(
        self,
        *,
        objective_id: str,
        title: str,
        description: str,
        status: ObjectiveStatus | str = ObjectiveStatus.ACTIVE,
        associated_session_id: str | None = None,
    ) -> ObjectiveRecord:
        existing = self.get_by_id(objective_id)
        if existing is None:
            return self.create(
                objective_id=objective_id,
                title=title,
                description=description,
                status=status,
                associated_session_id=associated_session_id,
            )
        updated = self.update(
            objective_id,
            title=title,
            description=description,
            status=status,
            associated_session_id=associated_session_id,
        )
        if updated is None:
            raise RuntimeError(f"objective disappeared during update: {objective_id}")
        return updated

    def update(
        self,
        objective_id: str,
        *,
        title: str | None = None,
        description: str | None = None,
        status: ObjectiveStatus | str | None = None,
        associated_session_id: str | None = None,
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
            associated_session_id=associated_session_id,
        )
        current = self.get_by_id(command.objective_id)
        if current is None:
            return None

        self.db.execute(
            """
            UPDATE objectives
            SET title = ?, description = ?, status = ?, associated_session_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.description if command.description is not None else current.description,
                command.status.value if command.status is not None else current.status.value,
                command.associated_session_id
                if command.associated_session_id is not None
                else current.associated_session_id,
                utc_now(),
                command.objective_id,
            ),
        )
        return self.get_by_id(command.objective_id)

    def get_by_id(self, objective_id: str) -> ObjectiveRecord | None:
        row = self.db.fetchone("SELECT * FROM objectives WHERE id = ?", (objective_id,))
        return objective_row(row) if row else None

    def get(self, objective_id: str) -> ObjectiveRecord | None:
        return self.get_by_id(objective_id)

    def get_active(self) -> ObjectiveRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM objectives WHERE status = 'active' ORDER BY created_at LIMIT 1"
        )
        return objective_row(row) if row else None

    def list_all(self) -> list[ObjectiveRecord]:
        return [
            objective_row(row)
            for row in self.db.fetchall("SELECT * FROM objectives ORDER BY created_at")
        ]
