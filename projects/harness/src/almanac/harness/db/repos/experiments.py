from __future__ import annotations

from ..models import CreateExperiment, UpdateExperiment
from ..records import ExperimentRecord
from ..serialization import experiment_row, json_dumps, utc_now
from .base import BaseRepository


class ExperimentsRepository(BaseRepository):
    def create(
        self,
        *,
        experiment_id: str,
        run_id: str,
        intent: str,
        change_summary: str,
        components: list[str],
        based_on: list[str],
    ) -> ExperimentRecord:
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
        record = self.get(command.experiment_id)
        if record is None:
            raise RuntimeError(f"experiment was not persisted: {command.experiment_id}")
        return record

    def update(
        self,
        experiment_id: str,
        *,
        status: str,
        suspicious: bool | None = None,
        suspicious_reason: str | None = None,
        note: str | None = None,
    ) -> ExperimentRecord | None:
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

        next_suspicious = current.suspicious if command.suspicious is None else command.suspicious
        next_reason = current.suspicious_reason if command.suspicious_reason is None else command.suspicious_reason
        next_note = current.note if command.note is None else command.note
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

    def get_by_id(self, experiment_id: str) -> ExperimentRecord | None:
        row = self.db.fetchone("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        return experiment_row(row) if row else None

    def get(self, experiment_id: str) -> ExperimentRecord | None:
        return self.get_by_id(experiment_id)

    def list_all(self) -> list[ExperimentRecord]:
        return [
            experiment_row(row)
            for row in self.db.fetchall("SELECT * FROM experiments ORDER BY created_at")
        ]

    def list_for_run(self, run_id: str) -> list[ExperimentRecord]:
        return [
            experiment_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM experiments WHERE run_id = ? ORDER BY created_at",
                (run_id,),
            )
        ]
