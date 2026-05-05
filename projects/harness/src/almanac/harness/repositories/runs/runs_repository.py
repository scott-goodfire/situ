from __future__ import annotations

from ...core.db.serialization import run_row, utc_now
from ...records import RunRecord
from ..base import BaseRepository
from .runs_commands import CreateRun, UpdateRunStatus


class RunsRepository(BaseRepository):
    def create(self, run_id: str) -> RunRecord:
        command = CreateRun(run_id=run_id)
        now = utc_now()
        self.db.execute(
            "INSERT INTO runs (id, status, created_at, updated_at) VALUES (?, 'running', ?, ?)",
            (command.run_id, now, now),
        )
        record = self.get(command.run_id)
        if record is None:
            raise RuntimeError(f"run was not persisted: {command.run_id}")
        return record

    def update_status(self, run_id: str, status: str) -> RunRecord | None:
        command = UpdateRunStatus(run_id=run_id, status=status)
        self.db.execute(
            "UPDATE runs SET status = ?, updated_at = ? WHERE id = ?",
            (command.status, utc_now(), command.run_id),
        )
        return self.get(command.run_id)

    def get_by_id(self, run_id: str) -> RunRecord | None:
        row = self.db.fetchone("SELECT * FROM runs WHERE id = ?", (run_id,))
        return run_row(row) if row else None

    def get(self, run_id: str) -> RunRecord | None:
        return self.get_by_id(run_id)

    def list_all(self) -> list[RunRecord]:
        return [run_row(row) for row in self.db.fetchall("SELECT * FROM runs ORDER BY created_at")]
