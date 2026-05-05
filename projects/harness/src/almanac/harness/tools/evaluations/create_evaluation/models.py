from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class CreateEvaluationResult(AlmanacToolReturn):
    evaluation: dict[str, Any] | None = None
