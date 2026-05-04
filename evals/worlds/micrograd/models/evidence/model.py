from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class MicrogradEvidence:
    experiment_id: str
    components: tuple[str, ...]
    summary: str
    signals: dict[str, int | float | str | bool | None]
    raw: dict[str, Any]
