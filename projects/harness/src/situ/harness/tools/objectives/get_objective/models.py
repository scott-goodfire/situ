from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class GetObjectiveResult(SituToolReturn):
    objective: dict[str, Any] | None = None
