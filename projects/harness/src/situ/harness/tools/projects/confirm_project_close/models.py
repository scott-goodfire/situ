from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class ConfirmProjectCloseResult(SituToolReturn):
    project: dict[str, Any] | None = None
    message: str | None = None
