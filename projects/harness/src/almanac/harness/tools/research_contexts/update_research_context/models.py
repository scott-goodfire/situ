from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class UpdateResearchContextResult(AlmanacToolReturn):
    research_context: dict[str, Any] | None = None
