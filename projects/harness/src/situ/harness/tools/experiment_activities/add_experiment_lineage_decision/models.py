from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class AddExperimentLineageDecisionResult(SituToolReturn):
    activity: dict[str, Any] | None = None
