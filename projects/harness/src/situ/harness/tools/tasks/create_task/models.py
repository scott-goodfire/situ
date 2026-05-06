from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class CreateTaskResult(SituToolReturn):
    task: dict[str, Any] | None = None
    dependencies: list[dict[str, Any]] = Field(default_factory=list)
