from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class CreateHypothesisResult(AlmanacToolReturn):
    hypothesis: dict[str, Any] | None = None
