from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class UpdateProjectResult(SituToolReturn):
    project: dict[str, Any] | None = None
