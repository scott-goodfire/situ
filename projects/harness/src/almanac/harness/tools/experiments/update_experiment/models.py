from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class UpdateExperimentResult(AlmanacToolReturn):
    experiment: dict[str, Any] | None = None
