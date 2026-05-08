from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class CompleteAnalysisResult(SituToolReturn):
    analysis: dict[str, Any] | None = None
