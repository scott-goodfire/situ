from __future__ import annotations

from typing import Literal

from ..base import DbRecord


FindingConfidence = Literal["low", "medium", "high"]
FindingStatus = Literal["open", "supported", "contradicted"]


class FindingRecord(DbRecord):
    id: str
    run_id: str
    summary: str
    evidence_experiment_ids: list[str]
    confidence: FindingConfidence
    status: FindingStatus
    created_at: str
    updated_at: str
