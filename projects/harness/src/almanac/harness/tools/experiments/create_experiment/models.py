from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class CreateExperimentResult(AlmanacToolReturn):
    experiment: dict[str, Any] | None = None
