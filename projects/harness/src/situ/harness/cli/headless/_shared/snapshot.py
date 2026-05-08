from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from ...local_session import read_live_session
from ....app import HarnessApp
from ....core.paths import resolve_app_root
from .rpc import rpc_request


def load_snapshot(workspace: Path) -> tuple[str, dict[str, Any]]:
    live_session = read_live_session(workspace)
    if live_session is not None:
        return "live", rpc_request(live_session, "collections.bootstrap", {})

    app = HarnessApp(
        workspace,
        app_root=resolve_app_root(Path(__file__)),
        notify=lambda _method, _params: None,
    )
    return "local", asyncio.run(app.handle_async("collections.bootstrap", {}))
