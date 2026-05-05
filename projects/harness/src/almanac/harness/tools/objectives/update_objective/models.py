from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class UpdateObjectiveResult(AlmanacToolReturn):
    objective: dict[str, Any] | None = None
