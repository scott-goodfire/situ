from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class AcceptEvaluationResult(SituToolReturn):
    evaluation: dict[str, Any] | None = None
