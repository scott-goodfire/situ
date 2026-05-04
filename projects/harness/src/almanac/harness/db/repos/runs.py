from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from ..database import Database
from ..models import CreateRun, UpdateRunStatus
from ..serialization import utc_now


class RunsRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database

    def create(self, run_id: str) -> dict[str, Any]:
        command = CreateRun(run_id=run_id)
        now = utc_now()
        self.db.execute(
            "INSERT INTO runs (id, status, created_at, updated_at) VALUES (?, 'running', ?, ?)",
            (command.run_id, now, now),
        )
        return self.get(command.run_id) or {}

    def update_status(self, run_id: str, status: str) -> dict[str, Any] | None:
        command = UpdateRunStatus(run_id=run_id, status=status)
        self.db.execute(
            "UPDATE runs SET status = ?, updated_at = ? WHERE id = ?",
            (command.status, utc_now(), command.run_id),
        )
        return self.get(command.run_id)

    def get(self, run_id: str) -> dict[str, Any] | None:
        row = self.db.fetchone("SELECT * FROM runs WHERE id = ?", (run_id,))
        return dict(row) if row else None

    def list_all(self) -> list[dict[str, Any]]:
        return [dict(row) for row in self.db.fetchall("SELECT * FROM runs ORDER BY created_at")]
