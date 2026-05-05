from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class CreateArtifactResult(SituToolReturn):
    artifact: dict[str, Any] | None = None
