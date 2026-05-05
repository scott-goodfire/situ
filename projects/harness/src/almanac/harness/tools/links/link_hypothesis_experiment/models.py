from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class LinkHypothesisExperimentResult(AlmanacToolReturn):
    link: dict[str, Any] | None = None
