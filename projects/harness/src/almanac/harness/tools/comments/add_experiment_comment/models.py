from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class AddExperimentCommentResult(AlmanacToolReturn):
    activity: dict[str, Any] | None = None
