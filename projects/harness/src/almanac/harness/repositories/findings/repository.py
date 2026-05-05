from __future__ import annotations

from typing import Literal

from ...core.db.serialization import finding_row, json_dumps, utc_now
from ...records import FindingRecord
from ..base import BaseRepository
from .command import UpsertFinding


class FindingsRepository(BaseRepository):
    def upsert(
        self,
        *,
        finding_id: str,
        run_id: str,
        summary: str,
        evidence_experiment_ids: list[str],
        confidence: Literal["low", "medium", "high"],
        status: Literal["open", "supported", "contradicted"],
    ) -> FindingRecord:
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
        created_at = existing.created_at if existing else now
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
        record = self.get(command.finding_id)
        if record is None:
            raise RuntimeError(f"finding was not persisted: {command.finding_id}")
        return record

    def get_by_id(self, finding_id: str) -> FindingRecord | None:
        row = self.db.fetchone("SELECT * FROM findings WHERE id = ?", (finding_id,))
        return finding_row(row) if row else None

    def get(self, finding_id: str) -> FindingRecord | None:
        return self.get_by_id(finding_id)

    def list_all(self) -> list[FindingRecord]:
        return [finding_row(row) for row in self.db.fetchall("SELECT * FROM findings ORDER BY created_at")]

    def list_for_run(self, run_id: str) -> list[FindingRecord]:
        return [
            finding_row(row)
            for row in self.db.fetchall("SELECT * FROM findings WHERE run_id = ? ORDER BY created_at", (run_id,))
        ]
