from __future__ import annotations

from typing import Any

from pydantic import Field

from ..base import DbRecord
from ..signal import SignalRecord


class EvidenceRecord(DbRecord):
    id: int
    run_id: str
    experiment_id: str
    summary: str
    signals: list[SignalRecord] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)
    created_at: str
