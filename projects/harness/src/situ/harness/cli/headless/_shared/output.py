from __future__ import annotations

import json
import sys
from typing import Any


def write_json(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, sort_keys=True))
    sys.stdout.write("\n")
    sys.stdout.flush()


def write_json_line(payload: dict[str, Any]) -> None:
    write_json(payload)


def error_message(error: Exception) -> str:
    if isinstance(error, RuntimeError):
        return str(error)
    return f"{type(error).__name__}: {error}"
