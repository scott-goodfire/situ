from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class RunExperimentResult(SituToolReturn):
    experiment: dict[str, Any] | None = None
    result: dict[str, Any] | None = None
    concerns: list[dict[str, str]] = Field(default_factory=list)
