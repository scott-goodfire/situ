from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class ClaimTaskResult(SituToolReturn):
    task: dict[str, Any] | None = None
