from __future__ import annotations

from ...core.db.serialization import evaluation_row, utc_now
from ...records import EvaluationRecord, WorkStatus, parse_work_status
from ..base import BaseRepository
from .command import CreateEvaluation, UpdateEvaluation


class EvaluationsRepository(BaseRepository):
    def create(
        self,
        *,
        evaluation_id: str,
        objective_id: str,
        title: str,
        summary: str,
        associated_session_id: str | None = None,
        associated_experiment_id: str | None = None,
        status: WorkStatus | str = WorkStatus.OPEN,
    ) -> EvaluationRecord:
        checked_status = parse_work_status(status=status, noun="evaluation")
        command = CreateEvaluation(
            evaluation_id=evaluation_id,
            objective_id=objective_id,
            title=title,
            summary=summary,
            associated_session_id=associated_session_id,
            associated_experiment_id=associated_experiment_id,
            status=checked_status,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO evaluations
              (id, objective_id, status, title, summary, associated_session_id,
               associated_experiment_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.evaluation_id,
                command.objective_id,
                command.status.value,
                command.title,
                command.summary,
                command.associated_session_id,
                command.associated_experiment_id,
                now,
                now,
            ),
        )
        record = self.get_by_id(command.evaluation_id)
        if record is None:
            raise RuntimeError(f"evaluation was not persisted: {command.evaluation_id}")
        return record

    def update(
        self,
        evaluation_id: str,
        *,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | str | None = None,
        associated_session_id: str | None = None,
        associated_experiment_id: str | None = None,
    ) -> EvaluationRecord | None:
        checked_status = (
            parse_work_status(status=status, noun="evaluation")
            if status is not None
            else None
        )
        command = UpdateEvaluation(
            evaluation_id=evaluation_id,
            title=title,
            summary=summary,
            status=checked_status,
            associated_session_id=associated_session_id,
            associated_experiment_id=associated_experiment_id,
        )
        current = self.get_by_id(command.evaluation_id)
        if current is None:
            return None

        self.db.execute(
            """
            UPDATE evaluations
            SET title = ?,
                summary = ?,
                status = ?,
                associated_session_id = ?,
                associated_experiment_id = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status.value if command.status is not None else current.status.value,
                command.associated_session_id
                if command.associated_session_id is not None
                else current.associated_session_id,
                command.associated_experiment_id
                if command.associated_experiment_id is not None
                else current.associated_experiment_id,
                utc_now(),
                command.evaluation_id,
            ),
        )
        return self.get_by_id(command.evaluation_id)

    def get_by_id(self, evaluation_id: str) -> EvaluationRecord | None:
        row = self.db.fetchone("SELECT * FROM evaluations WHERE id = ?", (evaluation_id,))
        return evaluation_row(row) if row else None

    def get(self, evaluation_id: str) -> EvaluationRecord | None:
        return self.get_by_id(evaluation_id)

    def list_all(self) -> list[EvaluationRecord]:
        return [
            evaluation_row(row)
            for row in self.db.fetchall("SELECT * FROM evaluations ORDER BY created_at")
        ]

    def list_for_objective(self, objective_id: str) -> list[EvaluationRecord]:
        return [
            evaluation_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM evaluations WHERE objective_id = ? ORDER BY created_at",
                (objective_id,),
            )
        ]

    def list_for_session(self, session_id: str) -> list[EvaluationRecord]:
        return [
            evaluation_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM evaluations
                WHERE associated_session_id = ?
                ORDER BY created_at
                """,
                (session_id,),
            )
        ]

    def list_for_experiment(self, experiment_id: str) -> list[EvaluationRecord]:
        return [
            evaluation_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM evaluations
                WHERE associated_experiment_id = ?
                ORDER BY created_at
                """,
                (experiment_id,),
            )
        ]
