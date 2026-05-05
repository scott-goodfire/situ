from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class CreateResearchContextResult(SituToolReturn):
    research_context: dict[str, Any] | None = None
