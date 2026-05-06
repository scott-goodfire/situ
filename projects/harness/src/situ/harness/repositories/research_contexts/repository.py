from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import ResearchContextRecord
from ..base import BaseRepository
from .command import CreateResearchContext, UpdateResearchContext


def _research_context_row(row: Any) -> ResearchContextRecord:
    return ResearchContextRecord(
        id=row["id"],
        session_id=row["session_id"],
        body=row["body"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class ResearchContextsRepository(BaseRepository):
    def create(
        self,
        *,
        research_context_id: str,
        session_id: str,
        body: str,
    ) -> ResearchContextRecord:
        command = CreateResearchContext(
            research_context_id=research_context_id,
            session_id=session_id,
            body=body,
        )
        now = utc_now()
        self.db.execute(
            """
            INSERT INTO research_contexts
              (id, session_id, body, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                command.research_context_id,
                command.session_id,
                command.body,
                now,
                now,
            ),
        )
        record = self.get_by_id(command.research_context_id)
        if record is None:
            raise RuntimeError(
                f"research context was not persisted: {command.research_context_id}"
            )
        return record

    def update(
        self,
        research_context_id: str,
        *,
        body: str | None = None,
    ) -> ResearchContextRecord | None:
        command = UpdateResearchContext(
            research_context_id=research_context_id,
            body=body,
        )
        current = self.get_by_id(command.research_context_id)
        if current is None:
            return None
        self.db.execute(
            """
            UPDATE research_contexts
            SET body = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.body if command.body is not None else current.body,
                utc_now(),
                command.research_context_id,
            ),
        )
        return self.get_by_id(command.research_context_id)

    def get_by_id(self, research_context_id: str) -> ResearchContextRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM research_contexts WHERE id = ?", (research_context_id,)
        )
        return _research_context_row(row) if row else None

    def get(self, research_context_id: str) -> ResearchContextRecord | None:
        return self.get_by_id(research_context_id)

    def get_for_session(self, session_id: str) -> ResearchContextRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM research_contexts WHERE session_id = ?", (session_id,)
        )
        return _research_context_row(row) if row else None

    def list_all(self) -> list[ResearchContextRecord]:
        return [
            _research_context_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM research_contexts ORDER BY created_at"
            )
        ]
