from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class AcceptExperimentResult(SituToolReturn):
    experiment: dict[str, Any] | None = None
