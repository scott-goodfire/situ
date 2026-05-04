from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from ..database import Database
from ..models import CreateExperiment, UpdateExperiment
from ..serialization import experiment_row, json_dumps, utc_now


class ExperimentsRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database

    def create(
        self,
        *,
        experiment_id: str,
        run_id: str,
        intent: str,
        change_summary: str,
        components: list[str],
        based_on: list[str],
    ) -> dict[str, Any]:
        command = CreateExperiment(
            experiment_id=experiment_id,
            run_id=run_id,
            intent=intent,
            change_summary=change_summary,
            components=components,
            based_on=based_on,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO experiments
              (id, run_id, status, intent, change_summary, components_json,
               based_on_json, created_at, updated_at)
            VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?)
            """,
            (
                command.experiment_id,
                command.run_id,
                command.intent,
                command.change_summary,
                json_dumps(command.components),
                json_dumps(command.based_on),
                now,
                now,
            ),
        )
        return self.get(command.experiment_id) or {}

    def update(
        self,
        experiment_id: str,
        *,
        status: str,
        suspicious: bool | None = None,
        suspicious_reason: str | None = None,
        note: str | None = None,
    ) -> dict[str, Any] | None:
        command = UpdateExperiment(
            experiment_id=experiment_id,
            status=status,
            suspicious=suspicious,
            suspicious_reason=suspicious_reason,
            note=note,
        )
        current = self.get(command.experiment_id)
        if current is None:
            return None

        next_suspicious = current["suspicious"] if command.suspicious is None else command.suspicious
        next_reason = current["suspicious_reason"] if command.suspicious_reason is None else command.suspicious_reason
        next_note = current["note"] if command.note is None else command.note
        self.db.execute(
            """
            UPDATE experiments
            SET status = ?, suspicious = ?, suspicious_reason = ?, note = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.status,
                int(next_suspicious),
                next_reason,
                next_note,
                utc_now(),
                command.experiment_id,
            ),
        )
        return self.get(command.experiment_id)

    def get(self, experiment_id: str) -> dict[str, Any] | None:
        row = self.db.fetchone("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        return experiment_row(row) if row else None

    def list_all(self) -> list[dict[str, Any]]:
        return [
            experiment_row(row)
            for row in self.db.fetchall("SELECT * FROM experiments ORDER BY created_at")
        ]

    def list_for_run(self, run_id: str) -> list[dict[str, Any]]:
        return [
            experiment_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM experiments WHERE run_id = ? ORDER BY created_at",
                (run_id,),
            )
        ]
