from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class ResolveHypothesisResult(SituToolReturn):
    hypothesis: dict[str, Any] | None = None
    activity: dict[str, Any] | None = None
