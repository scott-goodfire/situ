from __future__ import annotations

from ..models import AddWarning
from ..records import WarningRecord
from ..serialization import utc_now, warning_row
from .base import BaseRepository


class WarningsRepository(BaseRepository):
    def add(
        self,
        *,
        run_id: str,
        kind: str,
        message: str,
        experiment_id: str | None = None,
    ) -> WarningRecord:
        command = AddWarning(
            run_id=run_id,
            kind=kind,
            message=message,
            experiment_id=experiment_id,
        )
        created_at = utc_now()
        cursor = self.db.execute(
            """
            INSERT INTO warnings (run_id, experiment_id, kind, message, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (command.run_id, command.experiment_id, command.kind, command.message, created_at),
        )
        return WarningRecord(
            id=int(cursor.lastrowid),
            run_id=command.run_id,
            experiment_id=command.experiment_id,
            kind=command.kind,
            message=command.message,
            created_at=created_at,
        )

    def get_by_id(self, warning_id: int) -> WarningRecord | None:
        row = self.db.fetchone("SELECT * FROM warnings WHERE id = ?", (warning_id,))
        return warning_row(row) if row else None

    def list_all(self) -> list[WarningRecord]:
        return [warning_row(row) for row in self.db.fetchall("SELECT * FROM warnings ORDER BY id")]

    def list_for_run(self, run_id: str) -> list[WarningRecord]:
        return [
            warning_row(row)
            for row in self.db.fetchall("SELECT * FROM warnings WHERE run_id = ? ORDER BY id", (run_id,))
        ]
