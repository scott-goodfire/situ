from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class GetEvaluationResult(SituToolReturn):
    evaluation: dict[str, Any] | None = None
