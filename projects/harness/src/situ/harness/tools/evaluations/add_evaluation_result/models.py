from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class AddEvaluationResult(SituToolReturn):
    activity: dict[str, Any] | None = None
