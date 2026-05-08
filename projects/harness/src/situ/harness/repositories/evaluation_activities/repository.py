from __future__ import annotations

from typing import Any

from ...core.db.fts import normalize_fts_query
from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import (
    EvaluationActivityKind,
    EvaluationActivityRecord,
    parse_evaluation_activity_kind,
)
from ..base import BaseRepository
from .command import AddEvaluationActivity


def _evaluation_activity_row(row: Any) -> EvaluationActivityRecord:
    return EvaluationActivityRecord(
        id=row["id"],
        evaluation_id=row["evaluation_id"],
        created_in_session_id=row["created_in_session_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class EvaluationActivitiesRepository(BaseRepository):
    async def add(
        self,
        *,
        evaluation_id: str,
        actor: str,
        kind: EvaluationActivityKind | str = EvaluationActivityKind.CREATED,
        body: str,
        payload: dict[str, Any] | None = None,
        created_in_session_id: str | None = None,
    ) -> EvaluationActivityRecord:
        command = AddEvaluationActivity(
            evaluation_id=evaluation_id,
            created_in_session_id=created_in_session_id,
            actor=actor,
            kind=parse_evaluation_activity_kind(kind),
            body=body,
            payload=payload or {},
        )
        cursor = await self.db.execute(
            """
            INSERT INTO evaluation_activities
              (evaluation_id, created_in_session_id, actor, kind, body, payload_json,
               created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.evaluation_id,
                command.created_in_session_id,
                command.actor,
                command.kind.value,
                command.body,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = await self.get_by_id(activity_id=int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("evaluation activity was not persisted")
        return record

    async def get_by_id(self, *, activity_id: int) -> EvaluationActivityRecord | None:
        row = await self.db.fetchone(
            "SELECT * FROM evaluation_activities WHERE id = ?",
            (activity_id,),
        )
        return _evaluation_activity_row(row) if row else None

    async def get(self, *, activity_id: int) -> EvaluationActivityRecord | None:
        return await self.get_by_id(activity_id=activity_id)

    async def list_all(self) -> list[EvaluationActivityRecord]:
        return [
            _evaluation_activity_row(row)
            for row in await self.db.fetchall("SELECT * FROM evaluation_activities ORDER BY id")
        ]

    async def list_for_evaluation(self, *, evaluation_id: str) -> list[EvaluationActivityRecord]:
        return [
            _evaluation_activity_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM evaluation_activities WHERE evaluation_id = ? ORDER BY id",
                (evaluation_id,),
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[EvaluationActivityRecord]:
        return [
            _evaluation_activity_row(row)
            for row in await self.db.fetchall(
                """
                SELECT evaluation_activities.*
                FROM evaluation_activities
                JOIN evaluations ON evaluations.id = evaluation_activities.evaluation_id
                WHERE evaluations.project_id = ?
                ORDER BY evaluation_activities.id
                """,
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[EvaluationActivityRecord]:
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
    ) -> list[tuple[EvaluationActivityRecord, str]]:
        normalized = normalize_fts_query(query)
        if not normalized:
            return []
        sql = """
            SELECT evaluation_activities.*,
                   snippet(evaluation_activities_fts, -1, '[', ']', '...', 12) AS _snippet
            FROM evaluation_activities_fts
            JOIN evaluation_activities
              ON evaluation_activities.id = evaluation_activities_fts.activity_id
            WHERE evaluation_activities_fts MATCH ?
              AND evaluation_activities_fts.project_id = ?
            ORDER BY bm25(evaluation_activities_fts)
            LIMIT ?
        """
        rows = await self.db.fetchall(sql, (normalized, project_id, limit))
        return [(_evaluation_activity_row(row), row["_snippet"]) for row in rows]
