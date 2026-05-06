from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class RequestProjectCloseResult(SituToolReturn):
    confirmation_required: bool = True
    confirmation_code: str | None = None
    project: dict[str, Any] | None = None
    message: str | None = None
