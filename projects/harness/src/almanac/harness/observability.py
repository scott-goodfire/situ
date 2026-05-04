from __future__ import annotations

import os
from pathlib import Path

import logfire

_CONFIGURED = False


def configure_observability(project_dir: Path | None = None) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    token = os.environ.get("ALMANAC_LOGFIRE_TOKEN")
    if token and not os.environ.get("LOGFIRE_TOKEN"):
        os.environ["LOGFIRE_TOKEN"] = token

    if project_dir is not None:
        os.environ.setdefault("LOGFIRE_DATA_DIR", str(project_dir / "logfire"))

    logfire.configure(
        send_to_logfire=os.environ.get("ALMANAC_LOGFIRE_SEND_TO_LOGFIRE", "if-token-present"),
        service_name=os.environ.get("ALMANAC_LOGFIRE_SERVICE_NAME", "almanac-harness"),
        environment=os.environ.get("ALMANAC_ENVIRONMENT", "local"),
        console=False,
    )
    logfire.instrument_pydantic_ai()
    _CONFIGURED = True


def span(name: str, **attributes: object):
    return logfire.span(name, attributes=attributes)
