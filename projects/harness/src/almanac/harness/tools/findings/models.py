from __future__ import annotations

from typing import Any, Literal

from ..common import AlmanacToolReturn

FindingConfidence = Literal["low", "medium", "high"]
FindingStatus = Literal["open", "supported", "contradicted"]


class RecordFindingResult(AlmanacToolReturn):
    finding: dict[str, Any] | None = None
