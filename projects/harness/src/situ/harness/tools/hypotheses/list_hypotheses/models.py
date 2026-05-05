from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import SituToolReturn


class ListHypothesesResult(SituToolReturn):
    hypotheses: list[dict[str, Any]] = Field(default_factory=list)
