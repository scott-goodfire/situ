from __future__ import annotations

import os
import threading
from pathlib import Path

from dbos import DBOS, DBOSConfig

from ...config import DEFAULTS
from .turso_sqlalchemy import create_turso_system_engine

_CONFIGURED = False
_LAUNCHED = False


def configure_dbos(project_dir: Path) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    project_dir.mkdir(parents=True, exist_ok=True)
    config: DBOSConfig = {
        "name": DEFAULTS.dbos_app_name,
        "system_database_engine": create_turso_system_engine(
            path=project_dir / "dbos.sqlite",
        ),
        "enable_otlp": True,
        "use_listen_notify": False,
        "notification_listener_polling_interval_sec": (
            DEFAULTS.dbos_notification_polling_interval_seconds
        ),
        "log_level": DEFAULTS.dbos_log_level,
        "executor_id": dbos_executor_id(),
    }
    DBOS(config=config)
    _CONFIGURED = True


def launch_dbos() -> None:
    global _LAUNCHED
    if _LAUNCHED:
        return
    error: list[BaseException] = []

    def launch() -> None:
        try:
            DBOS.launch()
        except BaseException as exc:
            error.append(exc)

    thread = threading.Thread(target=launch, name="situ-dbos-launch")
    thread.start()
    thread.join()
    if error:
        raise error[0]
    _LAUNCHED = True


def reset_dbos_for_tests() -> None:
    global _CONFIGURED, _LAUNCHED
    DBOS.destroy(destroy_registry=True, workflow_completion_timeout_sec=0)
    _CONFIGURED = False
    _LAUNCHED = False


def dbos_executor_id() -> str:
    configured = os.environ.get("SITU_DBOS_EXECUTOR_ID")
    if configured:
        return configured
    return f"{DEFAULTS.dbos_app_name}-{os.getpid()}"
