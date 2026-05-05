from __future__ import annotations

from ...core.db.serialization import experiment_row, utc_now
from ...records import ExperimentRecord, WorkStatus, parse_work_status
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
        associated_session_id: str | None = None,
        status: WorkStatus | str = WorkStatus.OPEN,
    ) -> ExperimentRecord:
        checked_status = parse_work_status(status=status, noun="experiment")
        command = CreateExperiment(
            experiment_id=experiment_id,
            objective_id=objective_id,
            title=title,
            summary=summary,
            associated_session_id=associated_session_id,
            status=checked_status,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO experiments
              (id, objective_id, status, title, summary, associated_session_id,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.experiment_id,
                command.objective_id,
                command.status.value,
                command.title,
                command.summary,
                command.associated_session_id,
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
        status: WorkStatus | str | None = None,
        associated_session_id: str | None = None,
    ) -> ExperimentRecord | None:
        checked_status = (
            parse_work_status(status=status, noun="experiment")
            if status is not None
            else None
        )
        command = UpdateExperiment(
            experiment_id=experiment_id,
            title=title,
            summary=summary,
            status=checked_status,
            associated_session_id=associated_session_id,
        )
        current = self.get_by_id(command.experiment_id)
        if current is None:
            return None

        self.db.execute(
            """
            UPDATE experiments
            SET title = ?, summary = ?, status = ?, associated_session_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status.value if command.status is not None else current.status.value,
                command.associated_session_id
                if command.associated_session_id is not None
                else current.associated_session_id,
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
                "SELECT * FROM experiments WHERE associated_session_id = ? ORDER BY created_at",
                (session_id,),
            )
        ]
