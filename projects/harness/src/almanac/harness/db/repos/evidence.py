from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from ..database import Database
from ..models import AddEvidence
from ..serialization import evidence_row, json_dumps, utc_now


class EvidenceRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database

    def add(
        self,
        *,
        run_id: str,
        experiment_id: str,
        summary: str,
        signals: list[dict[str, Any]],
        raw: dict[str, Any],
    ) -> dict[str, Any]:
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
        return {
            "id": int(cursor.lastrowid),
            "run_id": command.run_id,
            "experiment_id": command.experiment_id,
            "summary": command.summary,
            "signals": command.signals,
            "raw": command.raw,
            "created_at": created_at,
        }

    def list_all(self) -> list[dict[str, Any]]:
        return [evidence_row(row) for row in self.db.fetchall("SELECT * FROM evidence ORDER BY id")]

    def list_for_run(self, run_id: str) -> list[dict[str, Any]]:
        return [
            evidence_row(row)
            for row in self.db.fetchall("SELECT * FROM evidence WHERE run_id = ? ORDER BY id", (run_id,))
        ]

    def get_for_experiment(self, experiment_id: str) -> dict[str, Any] | None:
        row = self.db.fetchone(
            "SELECT * FROM evidence WHERE experiment_id = ? ORDER BY id DESC LIMIT 1",
            (experiment_id,),
        )
        return evidence_row(row) if row else None
