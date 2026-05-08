from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class AddMeasurementResult(SituToolReturn):
    measurement: dict[str, Any] | None = None
