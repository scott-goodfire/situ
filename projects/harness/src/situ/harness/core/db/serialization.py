from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def json_dumps(value: Any) -> str:
    return json.dumps(value, sort_keys=True)


def json_loads(value: str) -> Any:
    return json.loads(value)
