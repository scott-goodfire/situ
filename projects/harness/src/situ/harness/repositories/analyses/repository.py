from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import (
    AnalysisRecord,
    WorkStatus,
    parse_work_status,
)
from ..base import BaseRepository
from .command import CreateAnalysis, UpdateAnalysis

ANALYSIS_ID_PREFIX = RECORD_ID_PREFIXES["analysis"]


def _analysis_row(row: Any) -> AnalysisRecord:
    return AnalysisRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        created_by_agent_id=row["created_by_agent_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        content=row["content"],
        supersedes_analysis_id=row["supersedes_analysis_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class AnalysesRepository(BaseRepository):
    def create(
        self,
        *,
        analysis_id: str,
        project_id: str,
        title: str,
        summary: str,
        content: str,
        status: WorkStatus | str = WorkStatus.OPEN,
        created_in_session_id: str | None = None,
        created_by_agent_id: str | None = None,
        supersedes_analysis_id: str | None = None,
    ) -> AnalysisRecord:
        ensure_canonical_record_id(
            record_id=analysis_id,
            prefix=ANALYSIS_ID_PREFIX,
            noun="analysis",
        )
        command = CreateAnalysis(
            analysis_id=analysis_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            created_by_agent_id=created_by_agent_id,
            status=parse_work_status(status=status, noun="analysis"),
            title=title,
            summary=summary,
            content=content,
            supersedes_analysis_id=supersedes_analysis_id,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO analyses
              (id, project_id, created_in_session_id, created_by_agent_id,
               status, title, summary, content, supersedes_analysis_id,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.analysis_id,
                command.project_id,
                command.created_in_session_id,
                command.created_by_agent_id,
                command.status.value,
                command.title,
                command.summary,
                command.content,
                command.supersedes_analysis_id,
                now,
                now,
            ),
        )
        record = self.get_by_id(analysis_id=command.analysis_id)
        if record is None:
            raise RuntimeError(f"analysis was not persisted: {command.analysis_id}")
        return record

    def update(
        self,
        *,
        analysis_id: str,
        status: WorkStatus | str | None = None,
        title: str | None = None,
        summary: str | None = None,
        content: str | None = None,
        supersedes_analysis_id: str | None = None,
    ) -> AnalysisRecord | None:
        command = UpdateAnalysis(
            analysis_id=analysis_id,
            status=(
                parse_work_status(status=status, noun="analysis")
                if status is not None
                else None
            ),
            title=title,
            summary=summary,
            content=content,
            supersedes_analysis_id=supersedes_analysis_id,
        )
        current = self.get_by_id(analysis_id=command.analysis_id)
        if current is None:
            return None

        self.db.execute(
            """
            UPDATE analyses
            SET status = ?,
                title = ?,
                summary = ?,
                content = ?,
                supersedes_analysis_id = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                command.status.value if command.status is not None else current.status.value,
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.content if command.content is not None else current.content,
                (
                    command.supersedes_analysis_id
                    if command.supersedes_analysis_id is not None
                    else current.supersedes_analysis_id
                ),
                utc_now(),
                command.analysis_id,
            ),
        )
        return self.get_by_id(analysis_id=command.analysis_id)

    def get_by_id(self, *, analysis_id: str) -> AnalysisRecord | None:
        row = self.db.fetchone("SELECT * FROM analyses WHERE id = ?", (analysis_id,))
        return _analysis_row(row) if row else None

    def get(self, *, analysis_id: str) -> AnalysisRecord | None:
        return self.get_by_id(analysis_id=analysis_id)

    def list_all(self) -> list[AnalysisRecord]:
        return [
            _analysis_row(row)
            for row in self.db.fetchall("SELECT * FROM analyses ORDER BY created_at")
        ]

    def list_for_project(self, *, project_id: str) -> list[AnalysisRecord]:
        return [
            _analysis_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM analyses
                WHERE project_id = ?
                ORDER BY created_at
                """,
                (project_id,),
            )
        ]

    def list_for_session(self, *, session_id: str) -> list[AnalysisRecord]:
        session = self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    def next_id(self, *, project_id: str) -> str:
        rows = self.db.fetchall("SELECT id FROM analyses")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=ANALYSIS_ID_PREFIX,
        )
