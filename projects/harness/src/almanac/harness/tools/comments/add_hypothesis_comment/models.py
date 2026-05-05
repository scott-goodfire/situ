from __future__ import annotations

from typing import Any

from ...common import AlmanacToolReturn


class AddHypothesisCommentResult(AlmanacToolReturn):
    activity: dict[str, Any] | None = None
