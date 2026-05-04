from __future__ import annotations

import os
from pathlib import Path

from dbos import DBOS, DBOSConfig

_CONFIGURED = False
_LAUNCHED = False


def configure_dbos(project_dir: Path) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    database_url = os.environ.get("DBOS_SYSTEM_DATABASE_URL") or sqlite_url(project_dir / "dbos.sqlite")
    config: DBOSConfig = {
        "name": os.environ.get("ALMANAC_DBOS_APP_NAME", "almanac-harness"),
        "system_database_url": database_url,
        "enable_otlp": True,
        "use_listen_notify": False,
        "log_level": os.environ.get("ALMANAC_DBOS_LOG_LEVEL", "WARNING"),
    }
    DBOS(config=config)
    _CONFIGURED = True


def launch_dbos() -> None:
    global _LAUNCHED
    if _LAUNCHED:
        return
    DBOS.launch()
    _LAUNCHED = True


def sqlite_url(path: Path) -> str:
    return f"sqlite:///{path.resolve().as_posix()}"
