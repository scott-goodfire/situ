from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class LinkHypothesisExperimentResult(SituToolReturn):
    link: dict[str, Any] | None = None
