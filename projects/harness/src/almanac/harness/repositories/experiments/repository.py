from __future__ import annotations

from ...core.db.serialization import experiment_row, utc_now
from ...records import ExperimentRecord
from ..base import BaseRepository
from .command import CreateExperiment, UpdateExperiment


class ExperimentsRepository(BaseRepository):
    def create(
        self,
        *,
        experiment_id: str,
        objective_id: str,
        title: str,
        summary: str,
        created_in_session_id: str | None = None,
        status: str = "open",
    ) -> ExperimentRecord:
        command = CreateExperiment(
            experiment_id=experiment_id,
            objective_id=objective_id,
            title=title,
            summary=summary,
            created_in_session_id=created_in_session_id,
            status=status,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO experiments
              (id, objective_id, status, title, summary, created_in_session_id,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.experiment_id,
                command.objective_id,
                command.status,
                command.title,
                command.summary,
                command.created_in_session_id,
                now,
                now,
            ),
        )
        record = self.get_by_id(command.experiment_id)
        if record is None:
            raise RuntimeError(f"experiment was not persisted: {command.experiment_id}")
        return record

    def update(
        self,
        experiment_id: str,
        *,
        title: str | None = None,
        summary: str | None = None,
        status: str | None = None,
    ) -> ExperimentRecord | None:
        command = UpdateExperiment(
            experiment_id=experiment_id,
            title=title,
            summary=summary,
            status=status,
        )
        current = self.get_by_id(command.experiment_id)
        if current is None:
            return None

        self.db.execute(
            """
            UPDATE experiments
            SET title = ?, summary = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status if command.status is not None else current.status,
                utc_now(),
                command.experiment_id,
            ),
        )
        return self.get_by_id(command.experiment_id)

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

    def list_for_objective(self, objective_id: str) -> list[ExperimentRecord]:
        return [
            experiment_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM experiments WHERE objective_id = ? ORDER BY created_at",
                (objective_id,),
            )
        ]

    def list_for_session(self, session_id: str) -> list[ExperimentRecord]:
        return [
            experiment_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM experiments WHERE created_in_session_id = ? ORDER BY created_at",
                (session_id,),
            )
        ]
