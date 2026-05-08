from __future__ import annotations

from typing import Any

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
    def add(
        self,
        *,
        evaluation_id: str,
        actor: str,
        kind: EvaluationActivityKind | str = EvaluationActivityKind.RESULT,
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
        cursor = self.db.execute_blocking(
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
        record = self.get_by_id(activity_id=int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("evaluation activity was not persisted")
        return record

    def get_by_id(self, *, activity_id: int) -> EvaluationActivityRecord | None:
        row = self.db.fetchone_blocking(
            "SELECT * FROM evaluation_activities WHERE id = ?",
            (activity_id,),
        )
        return _evaluation_activity_row(row) if row else None

    def get(self, *, activity_id: int) -> EvaluationActivityRecord | None:
        return self.get_by_id(activity_id=activity_id)

    def list_all(self) -> list[EvaluationActivityRecord]:
        return [
            _evaluation_activity_row(row)
            for row in self.db.fetchall_blocking("SELECT * FROM evaluation_activities ORDER BY id")
        ]

    def list_for_evaluation(self, *, evaluation_id: str) -> list[EvaluationActivityRecord]:
        return [
            _evaluation_activity_row(row)
            for row in self.db.fetchall_blocking(
                "SELECT * FROM evaluation_activities WHERE evaluation_id = ? ORDER BY id",
                (evaluation_id,),
            )
        ]

    def list_for_project(self, *, project_id: str) -> list[EvaluationActivityRecord]:
        return [
            _evaluation_activity_row(row)
            for row in self.db.fetchall_blocking(
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

    def list_for_session(self, *, session_id: str) -> list[EvaluationActivityRecord]:
        session = self.db.fetchone_blocking("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )
