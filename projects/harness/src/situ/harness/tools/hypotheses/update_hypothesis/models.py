from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class UpdateHypothesisResult(SituToolReturn):
    hypothesis: dict[str, Any] | None = None
