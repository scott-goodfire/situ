from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class UpdateTaskResult(SituToolReturn):
    task: dict[str, Any] | None = None
