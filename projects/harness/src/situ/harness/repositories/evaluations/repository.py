from __future__ import annotations

from typing import Any

from ...core.db.fts import normalize_fts_query
from ...core.db.serialization import utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import EvaluationRecord, RecordStatus, parse_record_status
from ..base import BaseRepository
from .command import CreateEvaluation, UpdateEvaluation

EVALUATION_ID_PREFIX = RECORD_ID_PREFIXES["evaluation"]


def _evaluation_row(row: Any) -> EvaluationRecord:
    return EvaluationRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        associated_baseline_id=row["associated_baseline_id"],
        associated_experiment_id=row["associated_experiment_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class EvaluationsRepository(BaseRepository):
    async def create(
        self,
        *,
        evaluation_id: str,
        project_id: str,
        title: str,
        summary: str,
        associated_baseline_id: str | None = None,
        associated_experiment_id: str | None = None,
        created_in_session_id: str | None = None,
        status: RecordStatus | str = RecordStatus.TRIAGE,
    ) -> EvaluationRecord:
        ensure_canonical_record_id(
            record_id=evaluation_id,
            prefix=EVALUATION_ID_PREFIX,
            noun="evaluation",
        )
        checked_status = parse_record_status(status=status, noun="evaluation")
        command = CreateEvaluation(
            evaluation_id=evaluation_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            title=title,
            summary=summary,
            associated_baseline_id=associated_baseline_id,
            associated_experiment_id=associated_experiment_id,
            status=checked_status,
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO evaluations
              (id, project_id, created_in_session_id, status, title, summary,
               associated_baseline_id, associated_experiment_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.evaluation_id,
                command.project_id,
                command.created_in_session_id,
                command.status.value,
                command.title,
                command.summary,
                command.associated_baseline_id,
                command.associated_experiment_id,
                now,
                now,
            ),
        )
        record = await self.get_by_id(evaluation_id=command.evaluation_id)
        if record is None:
            raise RuntimeError(f"evaluation was not persisted: {command.evaluation_id}")
        return record

    async def update(
        self,
        *,
        evaluation_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: RecordStatus | str | None = None,
        associated_baseline_id: str | None = None,
        associated_experiment_id: str | None = None,
    ) -> EvaluationRecord | None:
        checked_status = (
            parse_record_status(status=status, noun="evaluation")
            if status is not None
            else None
        )
        command = UpdateEvaluation(
            evaluation_id=evaluation_id,
            title=title,
            summary=summary,
            status=checked_status,
            associated_baseline_id=associated_baseline_id,
            associated_experiment_id=associated_experiment_id,
        )
        current = await self.get_by_id(evaluation_id=command.evaluation_id)
        if current is None:
            return None
        next_associated_baseline_id = current.associated_baseline_id
        next_associated_experiment_id = current.associated_experiment_id
        if command.associated_baseline_id is not None:
            next_associated_baseline_id = command.associated_baseline_id
            next_associated_experiment_id = None
        if command.associated_experiment_id is not None:
            next_associated_baseline_id = None
            next_associated_experiment_id = command.associated_experiment_id

        await self.db.execute(
            """
            UPDATE evaluations
            SET title = ?,
                summary = ?,
                status = ?,
                associated_baseline_id = ?,
                associated_experiment_id = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status.value if command.status is not None else current.status.value,
                next_associated_baseline_id,
                next_associated_experiment_id,
                utc_now(),
                command.evaluation_id,
            ),
        )
        return await self.get_by_id(evaluation_id=command.evaluation_id)

    async def get_by_id(self, *, evaluation_id: str) -> EvaluationRecord | None:
        row = await self.db.fetchone("SELECT * FROM evaluations WHERE id = ?", (evaluation_id,))
        return _evaluation_row(row) if row else None

    async def get(self, *, evaluation_id: str) -> EvaluationRecord | None:
        return await self.get_by_id(evaluation_id=evaluation_id)

    async def list_all(self) -> list[EvaluationRecord]:
        return [
            _evaluation_row(row)
            for row in await self.db.fetchall("SELECT * FROM evaluations ORDER BY created_at")
        ]

    async def list_for_project(self, *, project_id: str) -> list[EvaluationRecord]:
        return [
            _evaluation_row(row)
            for row in await self.db.fetchall(
                """
                SELECT * FROM evaluations
                WHERE project_id = ?
                ORDER BY created_at
                """,
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[EvaluationRecord]:
        session = await self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            await self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    async def search(
        self,
        *,
        project_id: str,
        query: str,
        limit: int = 20,
        status: RecordStatus | str | None = None,
    ) -> list[tuple[EvaluationRecord, str]]:
        normalized = normalize_fts_query(query)
        if not normalized:
            return []
        where = ["evaluations_fts MATCH ?", "evaluations_fts.project_id = ?"]
        params: list[Any] = [normalized, project_id]
        if status is not None:
            where.append("evaluations.status = ?")
            params.append(parse_record_status(status=status, noun="evaluation").value)
        params.append(limit)
        sql = f"""
            SELECT evaluations.*,
                   snippet(evaluations_fts, -1, '[', ']', '...', 12) AS _snippet
            FROM evaluations_fts
            JOIN evaluations ON evaluations.id = evaluations_fts.evaluation_id
            WHERE {" AND ".join(where)}
            ORDER BY bm25(evaluations_fts)
            LIMIT ?
        """
        rows = await self.db.fetchall(sql, tuple(params))
        return [(_evaluation_row(row), row["_snippet"]) for row in rows]

    async def list_for_experiment(self, *, experiment_id: str) -> list[EvaluationRecord]:
        return [
            _evaluation_row(row)
            for row in await self.db.fetchall(
                """
                SELECT * FROM evaluations
                WHERE associated_experiment_id = ?
                ORDER BY created_at
                """,
                (experiment_id,),
            )
        ]

    async def list_for_baseline(self, *, baseline_id: str) -> list[EvaluationRecord]:
        return [
            _evaluation_row(row)
            for row in await self.db.fetchall(
                """
                SELECT * FROM evaluations
                WHERE associated_baseline_id = ?
                ORDER BY created_at
                """,
                (baseline_id,),
            )
        ]

    async def next_id(self, *, project_id: str) -> str:
        rows = await self.db.fetchall("SELECT id FROM evaluations")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=EVALUATION_ID_PREFIX,
        )
