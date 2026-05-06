from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import HypothesisActivityRecord
from ..base import BaseRepository
from .command import AddHypothesisActivity


def _hypothesis_activity_row(row: Any) -> HypothesisActivityRecord:
    return HypothesisActivityRecord(
        id=row["id"],
        hypothesis_id=row["hypothesis_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class HypothesisActivitiesRepository(BaseRepository):
    def add(
        self,
        *,
        hypothesis_id: str,
        actor: str,
        kind: str,
        body: str,
        payload: dict[str, Any] | None = None,
    ) -> HypothesisActivityRecord:
        command = AddHypothesisActivity(
            hypothesis_id=hypothesis_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload or {},
        )
        cursor = self.db.execute(
            """
            INSERT INTO hypothesis_activities
              (hypothesis_id, actor, kind, body, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                command.hypothesis_id,
                command.actor,
                command.kind,
                command.body,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = self.get_by_id(int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("hypothesis activity was not persisted")
        return record

    def get_by_id(self, activity_id: int) -> HypothesisActivityRecord | None:
        row = self.db.fetchone("SELECT * FROM hypothesis_activities WHERE id = ?", (activity_id,))
        return _hypothesis_activity_row(row) if row else None

    def get(self, activity_id: int) -> HypothesisActivityRecord | None:
        return self.get_by_id(activity_id)

    def list_all(self) -> list[HypothesisActivityRecord]:
        return [
            _hypothesis_activity_row(row)
            for row in self.db.fetchall("SELECT * FROM hypothesis_activities ORDER BY id")
        ]

    def list_for_hypothesis(self, hypothesis_id: str) -> list[HypothesisActivityRecord]:
        return [
            _hypothesis_activity_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM hypothesis_activities WHERE hypothesis_id = ? ORDER BY id",
                (hypothesis_id,),
            )
        ]
