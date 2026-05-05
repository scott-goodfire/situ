from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class CreateArtifactResult(AlmanacToolReturn):
    artifact: dict[str, Any] | None = None
