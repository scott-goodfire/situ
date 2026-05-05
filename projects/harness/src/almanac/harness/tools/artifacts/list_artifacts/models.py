from __future__ import annotations

from typing import Any

from pydantic import Field

from ...common import AlmanacToolReturn


class ListArtifactsResult(AlmanacToolReturn):
    artifacts: list[dict[str, Any]] = Field(default_factory=list)
