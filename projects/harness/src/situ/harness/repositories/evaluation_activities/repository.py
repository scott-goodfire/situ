from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import EvaluationActivityRecord
from ..base import BaseRepository
from .command import AddEvaluationActivity


def _evaluation_activity_row(row: Any) -> EvaluationActivityRecord:
    return EvaluationActivityRecord(
        id=row["id"],
        evaluation_id=row["evaluation_id"],
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
        kind: str,
        body: str,
        payload: dict[str, Any] | None = None,
    ) -> EvaluationActivityRecord:
        command = AddEvaluationActivity(
            evaluation_id=evaluation_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload or {},
        )
        cursor = self.db.execute(
            """
            INSERT INTO evaluation_activities
              (evaluation_id, actor, kind, body, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                command.evaluation_id,
                command.actor,
                command.kind,
                command.body,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = self.get_by_id(int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("evaluation activity was not persisted")
        return record

    def get_by_id(self, activity_id: int) -> EvaluationActivityRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM evaluation_activities WHERE id = ?",
            (activity_id,),
        )
        return _evaluation_activity_row(row) if row else None

    def get(self, activity_id: int) -> EvaluationActivityRecord | None:
        return self.get_by_id(activity_id)

    def list_all(self) -> list[EvaluationActivityRecord]:
        return [
            _evaluation_activity_row(row)
            for row in self.db.fetchall("SELECT * FROM evaluation_activities ORDER BY id")
        ]

    def list_for_evaluation(self, evaluation_id: str) -> list[EvaluationActivityRecord]:
        return [
            _evaluation_activity_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM evaluation_activities WHERE evaluation_id = ? ORDER BY id",
                (evaluation_id,),
            )
        ]
