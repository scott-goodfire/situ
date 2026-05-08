from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class CompleteEvaluationResult(SituToolReturn):
    evaluation: dict[str, Any] | None = None
