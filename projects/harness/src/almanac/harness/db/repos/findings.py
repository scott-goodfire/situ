from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from ..database import Database
from ..models import UpsertFinding
from ..serialization import finding_row, json_dumps, utc_now


class FindingsRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database

    def upsert(
        self,
        *,
        finding_id: str,
        run_id: str,
        summary: str,
        evidence_experiment_ids: list[str],
        confidence: Literal["low", "medium", "high"],
        status: Literal["open", "supported", "contradicted"],
    ) -> dict[str, Any]:
        command = UpsertFinding(
            finding_id=finding_id,
            run_id=run_id,
            summary=summary,
            evidence_experiment_ids=evidence_experiment_ids,
            confidence=confidence,
            status=status,
        )
        now = utc_now()
        existing = self.get(command.finding_id)
        created_at = existing["created_at"] if existing else now
        self.db.execute(
            """
            INSERT INTO findings
              (id, run_id, summary, evidence_experiment_ids_json, confidence,
               status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              summary = excluded.summary,
              evidence_experiment_ids_json = excluded.evidence_experiment_ids_json,
              confidence = excluded.confidence,
              status = excluded.status,
              updated_at = excluded.updated_at
            """,
            (
                command.finding_id,
                command.run_id,
                command.summary,
                json_dumps(command.evidence_experiment_ids),
                command.confidence,
                command.status,
                created_at,
                now,
            ),
        )
        return self.get(command.finding_id) or {}

    def get(self, finding_id: str) -> dict[str, Any] | None:
        row = self.db.fetchone("SELECT * FROM findings WHERE id = ?", (finding_id,))
        return finding_row(row) if row else None

    def list_all(self) -> list[dict[str, Any]]:
        return [finding_row(row) for row in self.db.fetchall("SELECT * FROM findings ORDER BY created_at")]

    def list_for_run(self, run_id: str) -> list[dict[str, Any]]:
        return [
            finding_row(row)
            for row in self.db.fetchall("SELECT * FROM findings WHERE run_id = ? ORDER BY created_at", (run_id,))
        ]
