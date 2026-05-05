from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import AlmanacToolReturn


class ListHypothesesResult(AlmanacToolReturn):
    hypotheses: list[dict[str, Any]] = Field(default_factory=list)
