from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class CancelBaselineResult(SituToolReturn):
    baseline: dict[str, Any] | None = None
