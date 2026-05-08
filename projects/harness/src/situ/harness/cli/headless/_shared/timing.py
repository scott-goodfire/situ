from __future__ import annotations

import time
from typing import Any


def timeout_deadline(timeout_seconds: float | None) -> float | None:
    if timeout_seconds is None:
        return None
    if timeout_seconds <= 0:
        return time.monotonic()
    return time.monotonic() + timeout_seconds


def is_deadline_expired(deadline: float | None) -> bool:
    if deadline is None:
        return False
    return time.monotonic() >= deadline


def latest_record(records: list[Any]) -> Any:
    if not records:
        return None
    return records[-1]
