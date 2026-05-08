from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class FailExperimentResult(SituToolReturn):
    experiment: dict[str, Any] | None = None
