from __future__ import annotations

from typing import Any

from ..models import AddEvidence
from ..records import EvidenceRecord
from ..serialization import evidence_row, json_dumps, utc_now
from .base import BaseRepository


class EvidenceRepository(BaseRepository):
    def add(
        self,
        *,
        run_id: str,
        experiment_id: str,
        summary: str,
        signals: list[dict[str, Any]],
        raw: dict[str, Any],
    ) -> EvidenceRecord:
        command = AddEvidence(
            run_id=run_id,
            experiment_id=experiment_id,
            summary=summary,
            signals=signals,
            raw=raw,
        )
        created_at = utc_now()
        cursor = self.db.execute(
            """
            INSERT INTO evidence
              (run_id, experiment_id, summary, signals_json, raw_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                command.run_id,
                command.experiment_id,
                command.summary,
                json_dumps(command.signals),
                json_dumps(command.raw),
                created_at,
            ),
        )
        return EvidenceRecord(
            id=int(cursor.lastrowid),
            run_id=command.run_id,
            experiment_id=command.experiment_id,
            summary=command.summary,
            signals=command.signals,
            raw=command.raw,
            created_at=created_at,
        )

    def get_by_id(self, evidence_id: int) -> EvidenceRecord | None:
        row = self.db.fetchone("SELECT * FROM evidence WHERE id = ?", (evidence_id,))
        return evidence_row(row) if row else None

    def list_all(self) -> list[EvidenceRecord]:
        return [evidence_row(row) for row in self.db.fetchall("SELECT * FROM evidence ORDER BY id")]

    def list_for_run(self, run_id: str) -> list[EvidenceRecord]:
        return [
            evidence_row(row)
            for row in self.db.fetchall("SELECT * FROM evidence WHERE run_id = ? ORDER BY id", (run_id,))
        ]

    def get_for_experiment(self, experiment_id: str) -> EvidenceRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM evidence WHERE experiment_id = ? ORDER BY id DESC LIMIT 1",
            (experiment_id,),
        )
        return evidence_row(row) if row else None
