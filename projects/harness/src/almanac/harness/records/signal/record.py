from __future__ import annotations

from typing import Any

from ..base import DbRecord


class SignalRecord(DbRecord):
    key: str
    value: Any
    unit: str | None = None
