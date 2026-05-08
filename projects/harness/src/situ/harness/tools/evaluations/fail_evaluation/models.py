from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class FailEvaluationResult(SituToolReturn):
    evaluation: dict[str, Any] | None = None
