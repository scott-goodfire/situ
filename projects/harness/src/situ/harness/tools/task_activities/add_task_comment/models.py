from __future__ import annotations

from typing import Any

from ...common import SituToolReturn


class AddTaskCommentResult(SituToolReturn):
    activity: dict[str, Any] | None = None
