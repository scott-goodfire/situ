from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import ExperimentRecord, WorkStatus, parse_work_status
from ..base import BaseRepository
from .command import CreateExperiment, UpdateExperiment


def _experiment_row(row: Any) -> ExperimentRecord:
    return ExperimentRecord(
        id=row["id"],
        session_id=row["session_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class ExperimentsRepository(BaseRepository):
    def create(
        self,
        *,
        experiment_id: str,
        session_id: str,
        title: str,
        summary: str,
        status: WorkStatus | str = WorkStatus.OPEN,
    ) -> ExperimentRecord:
        checked_status = parse_work_status(status=status, noun="experiment")
        command = CreateExperiment(
            experiment_id=experiment_id,
            session_id=session_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO experiments
              (id, session_id, status, title, summary, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.experiment_id,
                command.session_id,
                command.status.value,
                command.title,
                command.summary,
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
                command.status.value if command.status is not None else current.status.value,
                utc_now(),
                command.experiment_id,
            ),
        )
        return self.get_by_id(command.experiment_id)

    def get_by_id(self, experiment_id: str) -> ExperimentRecord | None:
        row = self.db.fetchone("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        return _experiment_row(row) if row else None

    def get(self, experiment_id: str) -> ExperimentRecord | None:
        return self.get_by_id(experiment_id)

    def list_all(self) -> list[ExperimentRecord]:
        return [
            _experiment_row(row)
            for row in self.db.fetchall("SELECT * FROM experiments ORDER BY created_at")
        ]

    def list_for_session(self, session_id: str) -> list[ExperimentRecord]:
        return [
            _experiment_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM experiments WHERE session_id = ? ORDER BY created_at",
                (session_id,),
            )
        ]
