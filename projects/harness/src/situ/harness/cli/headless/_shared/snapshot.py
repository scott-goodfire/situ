from __future__ import annotations

from pathlib import Path
from typing import Any

from ...local_session import read_live_session
from ....app import HarnessApp
from ....core.paths import resolve_app_root
from .rpc import rpc_request


async def load_snapshot(workspace: Path) -> tuple[str, dict[str, Any]]:
    live_session = await read_live_session(workspace)
    if live_session is not None:
        return "live", rpc_request(live_session, "collections.bootstrap", {})

    app = await HarnessApp.create(
        workspace,
        app_root=await resolve_app_root(Path(__file__)),
        notify=_noop_notify,
    )
    return "local", await app.handle_async("collections.bootstrap", {})


async def _noop_notify(_method: str, _params: dict[str, Any]) -> None:
    return None
