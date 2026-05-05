from __future__ import annotations

from pathlib import Path

from dbos import DBOS, DBOSConfig

from ...config import DEFAULTS

_CONFIGURED = False
_LAUNCHED = False


def configure_dbos(project_dir: Path) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    config: DBOSConfig = {
        "name": DEFAULTS.dbos_app_name,
        "system_database_url": sqlite_url(project_dir / "dbos.sqlite"),
        "enable_otlp": True,
        "use_listen_notify": False,
        "log_level": DEFAULTS.dbos_log_level,
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
