from __future__ import annotations

from ...core.db.serialization import hypothesis_row, utc_now
from ...records import HypothesisRecord, WorkStatus, parse_work_status
from ..base import BaseRepository
from .command import CreateHypothesis, UpdateHypothesis


class HypothesesRepository(BaseRepository):
    def create(
        self,
        *,
        hypothesis_id: str,
        objective_id: str,
        title: str,
        summary: str,
        status: WorkStatus | str = WorkStatus.OPEN,
        associated_session_id: str | None = None,
    ) -> HypothesisRecord:
        checked_status = parse_work_status(status=status, noun="hypothesis")
        command = CreateHypothesis(
            hypothesis_id=hypothesis_id,
            objective_id=objective_id,
            title=title,
            summary=summary,
            status=checked_status,
            associated_session_id=associated_session_id,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO hypotheses
              (id, objective_id, title, summary, status, associated_session_id,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.hypothesis_id,
                command.objective_id,
                command.title,
                command.summary,
                command.status.value,
                command.associated_session_id,
                now,
                now,
            ),
        )
        record = self.get_by_id(command.hypothesis_id)
        if record is None:
            raise RuntimeError(f"hypothesis was not persisted: {command.hypothesis_id}")
        return record

    def upsert(
        self,
        *,
        hypothesis_id: str,
        objective_id: str,
        title: str,
        summary: str,
        status: WorkStatus | str = WorkStatus.OPEN,
        associated_session_id: str | None = None,
    ) -> HypothesisRecord:
        existing = self.get_by_id(hypothesis_id)
        if existing is None:
            return self.create(
                hypothesis_id=hypothesis_id,
                objective_id=objective_id,
                title=title,
                summary=summary,
                status=status,
                associated_session_id=associated_session_id,
            )
        updated = self.update(
            hypothesis_id,
            title=title,
            summary=summary,
            status=status,
            associated_session_id=associated_session_id,
        )
        if updated is None:
            raise RuntimeError(f"hypothesis disappeared during update: {hypothesis_id}")
        return updated

    def update(
        self,
        hypothesis_id: str,
        *,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | str | None = None,
        associated_session_id: str | None = None,
    ) -> HypothesisRecord | None:
        checked_status = (
            parse_work_status(status=status, noun="hypothesis")
            if status is not None
            else None
        )
        command = UpdateHypothesis(
            hypothesis_id=hypothesis_id,
            title=title,
            summary=summary,
            status=checked_status,
            associated_session_id=associated_session_id,
        )
        current = self.get_by_id(command.hypothesis_id)
        if current is None:
            return None
        self.db.execute(
            """
            UPDATE hypotheses
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
                command.hypothesis_id,
            ),
        )
        return self.get_by_id(command.hypothesis_id)

    def get_by_id(self, hypothesis_id: str) -> HypothesisRecord | None:
        row = self.db.fetchone("SELECT * FROM hypotheses WHERE id = ?", (hypothesis_id,))
        return hypothesis_row(row) if row else None

    def get(self, hypothesis_id: str) -> HypothesisRecord | None:
        return self.get_by_id(hypothesis_id)

    def list_all(self) -> list[HypothesisRecord]:
        return [
            hypothesis_row(row)
            for row in self.db.fetchall("SELECT * FROM hypotheses ORDER BY created_at")
        ]

    def list_for_objective(self, objective_id: str) -> list[HypothesisRecord]:
        return [
            hypothesis_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM hypotheses WHERE objective_id = ? ORDER BY created_at",
                (objective_id,),
            )
        ]
