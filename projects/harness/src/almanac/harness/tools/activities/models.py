from __future__ import annotations

from typing import Any, Literal

from ..common import AlmanacToolReturn


ActivityKind = Literal["comment", "update", "result", "concern", "decision"]


class RecordHypothesisActivityResult(AlmanacToolReturn):
    activity: dict[str, Any] | None = None


class RecordExperimentActivityResult(AlmanacToolReturn):
    activity: dict[str, Any] | None = None
