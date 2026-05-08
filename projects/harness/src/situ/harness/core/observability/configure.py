from __future__ import annotations

import os
from pathlib import Path

import logfire

from ...config import DEFAULTS, SituSecrets

_CONFIGURED = False


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
    return logfire.span(name, attributes=attributes)
