from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class ListEvaluationsResult(SituToolReturn):
    evaluations: list[dict[str, Any]] = Field(default_factory=list)
