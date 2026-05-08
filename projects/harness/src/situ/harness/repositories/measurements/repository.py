from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import MeasurementRecord
from ..base import BaseRepository
from .command import AddMeasurement

MEASUREMENT_ID_PREFIX = RECORD_ID_PREFIXES["measurement"]


def _measurement_row(row: Any) -> MeasurementRecord:
    return MeasurementRecord(
        id=row["id"],
        evaluation_id=row["evaluation_id"],
        created_in_session_id=row["created_in_session_id"],
        actor=row["actor"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class MeasurementsRepository(BaseRepository):
    def add(
        self,
        *,
        evaluation_id: str,
        actor: str,
        body: str,
        payload: dict[str, Any] | None = None,
        created_in_session_id: str | None = None,
    ) -> MeasurementRecord:
        measurement_id = self.next_id()
        ensure_canonical_record_id(
            record_id=measurement_id,
            prefix=MEASUREMENT_ID_PREFIX,
            noun="measurement",
        )
        command = AddMeasurement(
            evaluation_id=evaluation_id,
            created_in_session_id=created_in_session_id,
            actor=actor,
            body=body,
            payload=payload or {},
        )
        self.db.execute_blocking(
            """
            INSERT INTO measurements
              (id, evaluation_id, created_in_session_id, actor, body,
               payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                measurement_id,
                command.evaluation_id,
                command.created_in_session_id,
                command.actor,
                command.body,
                json_dumps(command.payload.to_storage_dict()),
                utc_now(),
            ),
        )
        record = self.get_by_id(measurement_id=measurement_id)
        if record is None:
            raise RuntimeError("measurement was not persisted")
        return record

    def get_by_id(self, *, measurement_id: str) -> MeasurementRecord | None:
        row = self.db.fetchone_blocking(
            "SELECT * FROM measurements WHERE id = ?",
            (measurement_id,),
        )
        return _measurement_row(row) if row else None

    def get(self, *, measurement_id: str) -> MeasurementRecord | None:
        return self.get_by_id(measurement_id=measurement_id)

    def list_all(self) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall_blocking(
                "SELECT * FROM measurements ORDER BY CAST(SUBSTR(id, 2) AS INTEGER)"
            )
        ]

    def list_for_evaluation(self, *, evaluation_id: str) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall_blocking(
                """
                SELECT * FROM measurements
                WHERE evaluation_id = ?
                ORDER BY CAST(SUBSTR(id, 2) AS INTEGER)
                """,
                (evaluation_id,),
            )
        ]

    def list_for_baseline(self, *, baseline_id: str) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall_blocking(
                """
                SELECT measurements.*
                FROM measurements
                JOIN evaluations ON evaluations.id = measurements.evaluation_id
                WHERE evaluations.associated_baseline_id = ?
                ORDER BY CAST(SUBSTR(measurements.id, 2) AS INTEGER)
                """,
                (baseline_id,),
            )
        ]

    def list_for_experiment(self, *, experiment_id: str) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall_blocking(
                """
                SELECT measurements.*
                FROM measurements
                JOIN evaluations ON evaluations.id = measurements.evaluation_id
                WHERE evaluations.associated_experiment_id = ?
                ORDER BY CAST(SUBSTR(measurements.id, 2) AS INTEGER)
                """,
                (experiment_id,),
            )
        ]

    def list_for_project(self, *, project_id: str) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall_blocking(
                """
                SELECT measurements.*
                FROM measurements
                JOIN evaluations ON evaluations.id = measurements.evaluation_id
                WHERE evaluations.project_id = ?
                ORDER BY CAST(SUBSTR(measurements.id, 2) AS INTEGER)
                """,
                (project_id,),
            )
        ]

    def list_for_session(self, *, session_id: str) -> list[MeasurementRecord]:
        session = self.db.fetchone_blocking("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    def next_id(self) -> str:
        rows = self.db.fetchall_blocking("SELECT id FROM measurements")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=MEASUREMENT_ID_PREFIX,
        )
