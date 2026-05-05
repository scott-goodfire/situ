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
        session_id: str,
        title: str,
        summary: str,
        status: WorkStatus | str = WorkStatus.OPEN,
    ) -> HypothesisRecord:
        checked_status = parse_work_status(status=status, noun="hypothesis")
        command = CreateHypothesis(
            hypothesis_id=hypothesis_id,
            session_id=session_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO hypotheses
              (id, session_id, title, summary, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.hypothesis_id,
                command.session_id,
                command.title,
                command.summary,
                command.status.value,
                now,
                now,
            ),
        )
        record = self.get_by_id(command.hypothesis_id)
        if record is None:
            raise RuntimeError(f"hypothesis was not persisted: {command.hypothesis_id}")
        return record

    def update(
        self,
        hypothesis_id: str,
        *,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | str | None = None,
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
        )
        current = self.get_by_id(command.hypothesis_id)
        if current is None:
            return None
        self.db.execute(
            """
            UPDATE hypotheses
            SET title = ?, summary = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status.value if command.status is not None else current.status.value,
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

    def list_for_session(self, session_id: str) -> list[HypothesisRecord]:
        return [
            hypothesis_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM hypotheses
                WHERE session_id = ?
                ORDER BY created_at
                """,
                (session_id,),
            )
        ]
