from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class CreateProjectResult(SituToolReturn):
    project: dict[str, Any] | None = None
    session: dict[str, Any] | None = None
