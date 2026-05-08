from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class RequestProjectCloseResult(SituToolReturn):
    confirmation_required: bool = True
    confirmation_code: str | None = None
    project: dict[str, Any] | None = None
    message: str | None = None
    unresolved_hypothesis_ids: list[str] = Field(default_factory=list)
