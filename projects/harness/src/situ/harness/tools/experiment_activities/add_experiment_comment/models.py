from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class AddExperimentCommentResult(SituToolReturn):
    activity: dict[str, Any] | None = None
