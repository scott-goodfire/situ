from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import logfire
from opentelemetry import trace

from ...config import DEFAULTS, SituSecrets

_CONFIGURED = False
_LOGFIRE_LEVEL_NUM_ATTRIBUTE = "logfire.level_num"
_LOGFIRE_LEVEL_NUMBERS = {
    "trace": 1,
    "debug": 5,
    "info": 9,
    "notice": 10,
    "warn": 13,
    "warning": 13,
    "error": 17,
    "fatal": 21,
}


async def configure_observability(project_dir: Path | None = None) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    secrets_home = project_dir.parent.parent if project_dir is not None else None
    await SituSecrets().apply_local_sdk_environment(home=secrets_home)

    if project_dir is not None:
        os.environ.setdefault("LOGFIRE_DATA_DIR", str(project_dir / "logfire"))

    logfire.configure(
        send_to_logfire="if-token-present",
        service_name=DEFAULTS.harness_logfire_service_name,
        environment=DEFAULTS.local_environment,
        console=False,
        scrubbing=False,
    )
    logfire.instrument_pydantic_ai()
    _CONFIGURED = True


def span(name: str, **attributes: object):
    return logfire.span(name, **_clean_attributes(attributes))


def set_current_span_attributes(**attributes: object) -> None:
    current = trace.get_current_span()
    for key, value in _clean_attributes(attributes).items():
        current.set_attribute(key, value)


def set_current_span_level(level: str) -> None:
    level_num = _LOGFIRE_LEVEL_NUMBERS[level]
    trace.get_current_span().set_attribute(_LOGFIRE_LEVEL_NUM_ATTRIBUTE, level_num)


def _clean_attributes(attributes: dict[str, object]) -> dict[str, Any]:
    return {key: value for key, value in attributes.items() if value is not None}
