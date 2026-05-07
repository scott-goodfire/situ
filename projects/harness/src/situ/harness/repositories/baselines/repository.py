from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import BaselineRecord, WorkStatus, parse_work_status
from ..base import BaseRepository
from .command import CreateBaseline, UpdateBaseline


def _baseline_row(row: Any) -> BaselineRecord:
    return BaselineRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class BaselinesRepository(BaseRepository):
    def create(
        self,
        *,
        baseline_id: str,
        project_id: str,
        title: str,
        summary: str,
        created_in_session_id: str | None = None,
        status: WorkStatus | str = WorkStatus.OPEN,
    ) -> BaselineRecord:
        checked_status = parse_work_status(status=status, noun="baseline")
        command = CreateBaseline(
            baseline_id=baseline_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO baselines
              (id, project_id, created_in_session_id, status, title, summary,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.baseline_id,
                command.project_id,
                command.created_in_session_id,
                command.status.value,
                command.title,
                command.summary,
                now,
                now,
            ),
        )
        record = self.get_by_id(baseline_id=command.baseline_id)
        if record is None:
            raise RuntimeError(f"baseline was not persisted: {command.baseline_id}")
        return record

    def update(
        self,
        *,
        baseline_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | str | None = None,
    ) -> BaselineRecord | None:
        checked_status = (
            parse_work_status(status=status, noun="baseline")
            if status is not None
            else None
        )
        command = UpdateBaseline(
            baseline_id=baseline_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        current = self.get_by_id(baseline_id=command.baseline_id)
        if current is None:
            return None

        self.db.execute(
            """
            UPDATE baselines
            SET title = ?, summary = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status.value if command.status is not None else current.status.value,
                utc_now(),
                command.baseline_id,
            ),
        )
        return self.get_by_id(baseline_id=command.baseline_id)

    def get_by_id(self, *, baseline_id: str) -> BaselineRecord | None:
        row = self.db.fetchone("SELECT * FROM baselines WHERE id = ?", (baseline_id,))
        return _baseline_row(row) if row else None

    def get(self, *, baseline_id: str) -> BaselineRecord | None:
        return self.get_by_id(baseline_id=baseline_id)

    def list_all(self) -> list[BaselineRecord]:
        return [
            _baseline_row(row)
            for row in self.db.fetchall("SELECT * FROM baselines ORDER BY created_at")
        ]

    def list_for_project(self, *, project_id: str) -> list[BaselineRecord]:
        return [
            _baseline_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM baselines WHERE project_id = ? ORDER BY created_at",
                (project_id,),
            )
        ]

    def list_for_session(self, *, session_id: str) -> list[BaselineRecord]:
        session = self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )
