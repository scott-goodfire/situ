from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from ..database import Database
from ..models import AddWarning
from ..serialization import utc_now


class WarningsRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database

    def add(
        self,
        *,
        run_id: str,
        kind: str,
        message: str,
        experiment_id: str | None = None,
    ) -> dict[str, Any]:
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
        return {
            "id": int(cursor.lastrowid),
            "run_id": command.run_id,
            "experiment_id": command.experiment_id,
            "kind": command.kind,
            "message": command.message,
            "created_at": created_at,
        }

    def list_all(self) -> list[dict[str, Any]]:
        return [dict(row) for row in self.db.fetchall("SELECT * FROM warnings ORDER BY id")]

    def list_for_run(self, run_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.db.fetchall("SELECT * FROM warnings WHERE run_id = ? ORDER BY id", (run_id,))
        ]
